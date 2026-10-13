import WidgetKit
import SwiftUI
import AppIntents

/// 큰 위젯 두 가지(iOS 17 부터). 위젯을 길게 눌러 "위젯 편집"에서 고른다.
///   레시피 위젯  고른 레시피 하나(고르지 않으면 "오늘의 레시피"), 용량 가리기
///   메모 위젯    메모 탭의 메모. 하나를 고르면 그 메모를 크게 전부, 고르지 않으면 고정한 것부터 목록으로
/// 한 위젯에서 "레시피냐 메모냐"를 바꾸게 하지 않고 위젯을 나눴다 — 메모를 골랐는데 레시피 · 용량 가리기 칸이
/// 그대로 보이면 헷갈린다.
/// 레시피와 메모는 앱이 App Group 에 적어 둔 요약에서 읽는다(Summary — www/js/widget.js).
/// 앱에 PIN 잠금을 건 사람의 것은 앱이 아예 넘기지 않는다. 그때는 안내 글만 보여준다.

// MARK: - 같이 쓰는 그림

@available(iOS 17.0, *)
private func boardLabel(_ text: String) -> some View {
    Text(text)
        .font(.system(size: 11, weight: .bold, design: .rounded))
        .foregroundColor(Ink.muted)
}

@available(iOS 17.0, *)
private func boardMouse(_ summary: Summary?, width: CGFloat, height: CGFloat) -> some View {
    let rows = summary?.faces["normal"] ?? Fallback.rows
    let pal = (summary?.pal.isEmpty ?? true) ? Fallback.pal : summary!.pal
    return PixelMouse(rows: rows, pal: pal).frame(width: width, height: height)
}

/// 보여줄 것이 없을 때의 안내.
@available(iOS 17.0, *)
private func boardNote(_ summary: Summary?, _ title: String, _ body: String) -> some View {
    VStack(alignment: .leading, spacing: 6) {
        Text(title).font(.system(size: 20, weight: .heavy, design: .rounded)).foregroundColor(Ink.text)
        Text(body).font(.system(size: 14, weight: .medium, design: .rounded)).foregroundColor(Ink.muted)
        Spacer(minLength: 0)
        HStack { Spacer(); boardMouse(summary, width: 56, height: 80) }
    }
}

/// 요약이 없거나(앱을 아직 안 열었다) 잠겨 있으면 그 안내를 돌려준다. 보여줄 수 있으면 nil.
@available(iOS 17.0, *)
private func boardBlocked(_ summary: Summary?) -> (String, String)? {
    guard let s = summary, s.hasBoard || s.locked else {
        return ("앱을 열어 주츄", "암기쥐를 한 번 열면 레시피와 메모가 여기에 보여요.")
    }
    if s.locked { return ("잠금을 건 앱이에요", "PIN 잠금을 쓰는 동안에는 레시피와 메모를 위젯에 내보내지 않아요.") }
    return nil
}

/// 자정마다 한 장씩 이레 치("오늘의 레시피"가 날마다 바뀐다). 앱이 고치면 그때 바로 다시 그린다.
private func boardDates() -> [Date] {
    let cal = Calendar.current
    let now = Date()
    var dates = [now]
    let midnight = cal.startOfDay(for: now)
    for i in 1...7 { if let d = cal.date(byAdding: .day, value: i, to: midnight) { dates.append(d) } }
    return dates
}

// MARK: - 레시피 위젯

/// 고르는 화면에 나오는 레시피 한 줄.
@available(iOS 17.0, *)
struct RecipeEntity: AppEntity {
    let id: String
    let name: String
    let temp: String

    static var typeDisplayRepresentation = TypeDisplayRepresentation(name: "레시피")
    static var defaultQuery = RecipeQuery()

    var displayRepresentation: DisplayRepresentation {
        temp.isEmpty ? DisplayRepresentation(title: "\(name)")
                     : DisplayRepresentation(title: "\(name)", subtitle: "\(temp)")
    }
}

@available(iOS 17.0, *)
struct RecipeQuery: EntityQuery {
    private func all() -> [RecipeEntity] {
        (Summary.load()?.recipes ?? []).map { RecipeEntity(id: $0.id, name: $0.n, temp: $0.t) }
    }
    func entities(for identifiers: [String]) async throws -> [RecipeEntity] {
        all().filter { identifiers.contains($0.id) }
    }
    func suggestedEntities() async throws -> [RecipeEntity] { all() }
}

@available(iOS 17.0, *)
struct RecipeIntent: WidgetConfigurationIntent {
    static var title: LocalizedStringResource = "레시피"
    static var description = IntentDescription("보여줄 레시피를 골라요.")

    /// 고르지 않으면 "오늘의 레시피": 아직 못 외운 메뉴를 날마다 하나씩.
    @Parameter(title: "레시피")
    var recipe: RecipeEntity?

    @Parameter(title: "용량 가리기", default: false)
    var hide: Bool
}

@available(iOS 17.0, *)
struct RecipeEntry: TimelineEntry {
    let date: Date
    let summary: Summary?
    let recipeID: String?
    let hide: Bool

    /// 보여줄 레시피. 고른 것이 있으면 그것, 없거나 지워졌으면 "오늘의 레시피".
    var recipe: (Summary.Recipe, picked: Bool)? {
        guard let s = summary, !s.recipes.isEmpty else { return nil }
        if let id = recipeID, let hit = s.recipes.first(where: { $0.id == id }) { return (hit, true) }
        /// 날짜로 자리를 하나 정하고, 거기서부터 처음 만나는 못 외운 메뉴를 고른다(다 외웠으면 그 자리의 메뉴).
        /// 못 외운 것만 모아 세면 하나를 외울 때마다 오늘의 레시피가 바뀐다. 이렇게 하면 그 메뉴를 외웠을 때만 다음 것으로 넘어간다.
        let all = s.recipes.sorted { $0.id < $1.id }
        let day = Int(Calendar(identifier: .gregorian).startOfDay(for: date).timeIntervalSince1970 / 86400)
        let start = ((day % all.count) + all.count) % all.count
        for step in 0..<all.count {
            let r = all[(start + step) % all.count]
            if !r.m { return (r, false) }
        }
        return (all[start], false)
    }
}

@available(iOS 17.0, *)
struct RecipeProvider: AppIntentTimelineProvider {
    func placeholder(in context: Context) -> RecipeEntry {
        RecipeEntry(date: Date(), summary: nil, recipeID: nil, hide: false)
    }
    func snapshot(for configuration: RecipeIntent, in context: Context) async -> RecipeEntry {
        RecipeEntry(date: Date(), summary: Summary.load(), recipeID: configuration.recipe?.id, hide: configuration.hide)
    }
    func timeline(for configuration: RecipeIntent, in context: Context) async -> Timeline<RecipeEntry> {
        let summary = Summary.load()
        let entries = boardDates().map {
            RecipeEntry(date: $0, summary: summary, recipeID: configuration.recipe?.id, hide: configuration.hide)
        }
        return Timeline(entries: entries, policy: .atEnd)
    }
}

@available(iOS 17.0, *)
struct RecipeView: View {
    let entry: RecipeEntry

    var body: some View {
        Group {
            if let why = boardBlocked(entry.summary) {
                boardNote(entry.summary, why.0, why.1)
            } else if let r = entry.recipe {
                recipeBoard(r.0, picked: r.picked)
            } else {
                boardNote(entry.summary, "레시피를 넣어 보츄", "앱에서 레시피를 넣으면 여기에 보여요.")
            }
        }
        .padding(16)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
        .widgetBackground(Ink.bg)
    }

    private func label(_ text: String) -> some View { boardLabel(text) }
    private func mouse(width: CGFloat, height: CGFloat) -> some View { boardMouse(entry.summary, width: width, height: height) }

    /// 레시피: 이름 · 온도 · 컵, 재료와 용량, 제조 순서. 위젯은 넘겨 볼 수 없어서 줄 수를 미리 나눈다.
    private func recipeBoard(_ r: Summary.Recipe, picked: Bool) -> some View {
        /// 재료가 두 벌(ICE · HOT)이면 세 줄씩, 한 벌이면 일곱 줄까지. 순서는 재료가 적을 때만 넉 줄, 많으면 두 줄, 두 벌이면 적지 않는다.
        let two = r.sets.count > 1
        let room = two ? 3 : 7
        let longest = r.sets.map { $0.ing.count }.max() ?? 0
        let stepRoom = two ? 0 : (longest <= 5 ? 4 : 2)
        return ZStack(alignment: .bottomTrailing) {
            VStack(alignment: .leading, spacing: 0) {
                label(picked ? (entry.hide ? "고른 레시피 · 용량 가림" : "고른 레시피")
                             : (entry.hide ? "오늘의 레시피 · 용량 가림" : "오늘의 레시피"))
                HStack(alignment: .firstTextBaseline, spacing: 8) {
                    Text(r.n)
                        .font(.system(size: 22, weight: .heavy, design: .rounded))
                        .foregroundColor(Ink.text)
                        .lineLimit(1)
                        .minimumScaleFactor(0.6)
                    if !r.t.isEmpty {
                        Text(r.t)
                            .font(.system(size: 11, weight: .heavy, design: .rounded))
                            .foregroundColor(Ink.bg)
                            .padding(.horizontal, 6).padding(.vertical, 2)
                            .background(Ink.accent)
                    }
                    Spacer(minLength: 0)
                    if !r.c.isEmpty { label(r.c) }
                }
                .padding(.top, 1)
                ForEach(0..<r.sets.count, id: \.self) { si in
                    let set = r.sets[si]
                    let hidden = max(0, set.ing.count - room) + (set.more ?? 0)
                    if !set.l.isEmpty { label(set.l + (hidden > 0 ? " · 외 \(hidden)개" : "")).padding(.top, 6) }
                    ForEach(0..<min(set.ing.count, room), id: \.self) { i in
                        let pair = set.ing[i]
                        HStack(spacing: 8) {
                            Text(pair.first ?? "")
                                .font(.system(size: 14, weight: .medium, design: .rounded))
                                .foregroundColor(Ink.text)
                                .lineLimit(1)
                            Spacer(minLength: 4)
                            if entry.hide {
                                Rectangle().fill(Ink.track).frame(width: 54, height: 13)
                            } else {
                                Text(pair.count > 1 ? pair[1] : "")
                                    .font(.system(size: 14, weight: .heavy, design: .rounded))
                                    .foregroundColor(Ink.text)
                                    .lineLimit(1)
                            }
                        }
                        .padding(.vertical, 3)
                        .overlay(Rectangle().fill(Ink.track).frame(height: 1), alignment: .bottom)
                    }
                    if set.l.isEmpty, hidden > 0 { label("외 \(hidden)개").padding(.top, 2) }
                }
                /// 용량을 가렸으면 제조 순서도 적지 않는다. 순서 글에 용량이 그대로 들어 있는 일이 많다.
                if entry.hide {
                    Text("용량은 앱에서 확인해요")
                        .font(.system(size: 12, weight: .medium, design: .rounded))
                        .foregroundColor(Ink.muted)
                        .padding(.top, 8)
                } else {
                    VStack(alignment: .leading, spacing: 2) {
                        ForEach(0..<min(r.steps.count, stepRoom), id: \.self) { i in
                            Text("\(i + 1). \(r.steps[i])")
                                .font(.system(size: 12, weight: .medium, design: .rounded))
                                .foregroundColor(Ink.muted)
                                .lineLimit(1)
                        }
                    }
                    .padding(.top, 8)
                    .padding(.trailing, 48)      // 쥐돌이가 서 있는 오른쪽 아래를 비켜 적는다
                }
                Spacer(minLength: 0)
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
            .clipped()
            mouse(width: 42, height: 60)
        }
    }
}

@available(iOS 17.0, *)
struct RecipeWidget: Widget {
    var body: some WidgetConfiguration {
        AppIntentConfiguration(kind: "AmgijwiRecipe", intent: RecipeIntent.self, provider: RecipeProvider()) { entry in
            RecipeView(entry: entry)
        }
        .configurationDisplayName("레시피")
        .description("고른 레시피를 크게 보여줘요. 위젯을 길게 눌러 편집에서 골라요.")
        .supportedFamilies([.systemLarge])
        .contentMarginsDisabled()
    }
}

// MARK: - 메모 위젯

/// 고르는 화면에 나오는 메모 한 줄(첫 줄을 제목처럼 보여준다).
@available(iOS 17.0, *)
struct MemoEntity: AppEntity {
    let id: String
    let text: String
    let pinned: Bool

    static var typeDisplayRepresentation = TypeDisplayRepresentation(name: "메모")
    static var defaultQuery = MemoQuery()

    var displayRepresentation: DisplayRepresentation {
        let first = text.split(separator: "\n", maxSplits: 1, omittingEmptySubsequences: true).first.map(String.init) ?? text
        let head = String(first.prefix(40))
        return pinned ? DisplayRepresentation(title: "\(head)", subtitle: "고정한 메모")
                      : DisplayRepresentation(title: "\(head)")
    }
}

@available(iOS 17.0, *)
struct MemoQuery: EntityQuery {
    private func all() -> [MemoEntity] {
        (Summary.load()?.memos ?? []).compactMap { m in
            guard let id = m.id else { return nil }
            return MemoEntity(id: id, text: m.t, pinned: m.p)
        }
    }
    func entities(for identifiers: [String]) async throws -> [MemoEntity] {
        all().filter { identifiers.contains($0.id) }
    }
    func suggestedEntities() async throws -> [MemoEntity] { all() }
}

@available(iOS 17.0, *)
struct MemoIntent: WidgetConfigurationIntent {
    static var title: LocalizedStringResource = "메모"
    static var description = IntentDescription("보여줄 메모를 골라요.")

    /// 고르지 않으면 고정한 것부터 목록으로 보여준다.
    @Parameter(title: "메모")
    var memo: MemoEntity?
}

@available(iOS 17.0, *)
struct MemoEntry: TimelineEntry {
    let date: Date
    let summary: Summary?
    let memoID: String?

    /// 고른 메모. 고르지 않았거나 지워졌으면 nil(목록을 보여준다).
    var picked: Summary.Memo? {
        guard let id = memoID else { return nil }
        return summary?.memos.first(where: { $0.id == id })
    }
}

@available(iOS 17.0, *)
struct MemoProvider: AppIntentTimelineProvider {
    func placeholder(in context: Context) -> MemoEntry { MemoEntry(date: Date(), summary: nil, memoID: nil) }
    func snapshot(for configuration: MemoIntent, in context: Context) async -> MemoEntry {
        MemoEntry(date: Date(), summary: Summary.load(), memoID: configuration.memo?.id)
    }
    /// 메모는 날짜에 따라 바뀌지 않는다. 앱이 고치면 그때 다시 그린다(WidgetBridge 가 reloadAllTimelines).
    func timeline(for configuration: MemoIntent, in context: Context) async -> Timeline<MemoEntry> {
        Timeline(entries: [MemoEntry(date: Date(), summary: Summary.load(), memoID: configuration.memo?.id)], policy: .never)
    }
}

@available(iOS 17.0, *)
struct MemoView: View {
    @Environment(\.widgetFamily) private var family
    let entry: MemoEntry

    var body: some View {
        Group {
            if let why = boardBlocked(entry.summary) {
                boardNote(entry.summary, why.0, why.1)
            } else if let memo = entry.picked {
                one(memo)
            } else {
                list(entry.summary?.memos ?? [])
            }
        }
        .padding(16)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
        .widgetBackground(Ink.bg)
    }

    /// 고른 메모 하나를 크게. 줄바꿈을 살리고, 길면 글씨를 조금 줄이다가 그래도 넘치면 끝을 … 로 줄인다.
    private func one(_ memo: Summary.Memo) -> some View {
        ZStack(alignment: .bottomTrailing) {
            VStack(alignment: .leading, spacing: 6) {
                boardLabel(memo.p ? "★ 고정한 메모" : "메모")
                Text(memo.t)
                    .font(.system(size: 17, weight: .semibold, design: .rounded))
                    .foregroundColor(Ink.text)
                    .lineSpacing(3)
                    .minimumScaleFactor(0.75)
                    .multilineTextAlignment(.leading)
                    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
            }
            /// 짧은 메모일 때만 쥐돌이가 구석에 선다. 긴 메모는 글이 자리를 다 쓴다.
            if memo.t.count <= (family == .systemLarge ? 160 : 50) {
                boardMouse(entry.summary, width: 42, height: 60)
            }
        }
    }

    /// 고르지 않았을 때: 고정한 것부터 목록으로. 큰 위젯 여섯 개, 중간 위젯 세 개.
    private func list(_ memos: [Summary.Memo]) -> some View {
        let room = family == .systemLarge ? 6 : 3
        return ZStack(alignment: .bottomTrailing) {
            VStack(alignment: .leading, spacing: 0) {
                boardLabel(memos.count > room ? "메모 · 외 \(memos.count - room)개" : "메모")
                if memos.isEmpty {
                    Text("아직 메모가 없어요")
                        .font(.system(size: 16, weight: .heavy, design: .rounded))
                        .foregroundColor(Ink.text)
                        .padding(.top, 4)
                }
                ForEach(0..<min(memos.count, room), id: \.self) { i in
                    HStack(alignment: .firstTextBaseline, spacing: 6) {
                        Text(memos[i].p ? "★" : "·")
                            .font(.system(size: 13, weight: .heavy, design: .rounded))
                            .foregroundColor(memos[i].p ? Ink.accent : Ink.muted)
                            .frame(width: 12, alignment: .leading)
                        Text(memos[i].t.replacingOccurrences(of: "\n", with: " "))
                            .font(.system(size: 14, weight: .medium, design: .rounded))
                            .foregroundColor(Ink.text)
                            .lineLimit(family == .systemLarge ? 2 : 1)
                    }
                    .padding(.vertical, 5)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .overlay(Rectangle().fill(Ink.track).frame(height: 1), alignment: .bottom)
                }
                Spacer(minLength: 0)
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
            .clipped()
            if family == .systemLarge, memos.count <= 4 { boardMouse(entry.summary, width: 42, height: 60) }
        }
    }
}

@available(iOS 17.0, *)
struct MemoWidget: Widget {
    var body: some WidgetConfiguration {
        AppIntentConfiguration(kind: "AmgijwiMemo", intent: MemoIntent.self, provider: MemoProvider()) { entry in
            MemoView(entry: entry)
        }
        .configurationDisplayName("메모")
        .description("메모 탭의 메모를 보여줘요. 위젯을 길게 눌러 편집에서 하나를 고르면 그 메모를 크게 보여줘요.")
        .supportedFamilies([.systemMedium, .systemLarge])
        .contentMarginsDisabled()
    }
}
