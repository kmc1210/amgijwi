import WidgetKit
import SwiftUI
import AppIntents

/// 큰 위젯: 고른 레시피 하나, 또는 메모.
/// 위젯을 길게 눌러 "위젯 편집"에서 무엇을 보여줄지 · 어느 레시피인지 · 용량을 가릴지 고른다(iOS 17 부터).
/// 레시피와 메모는 앱이 App Group 에 적어 둔 요약에서 읽는다(Summary — www/js/widget.js).
/// 앱에 PIN 잠금을 건 사람의 것은 앱이 아예 넘기지 않는다. 그때는 안내 글만 보여준다.

@available(iOS 17.0, *)
enum BoardKind: String, AppEnum {
    case recipe, memo

    static var typeDisplayRepresentation = TypeDisplayRepresentation(name: "보여줄 것")
    static var caseDisplayRepresentations: [BoardKind: DisplayRepresentation] = [
        .recipe: "레시피", .memo: "메모"
    ]
}

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
struct BoardIntent: WidgetConfigurationIntent {
    static var title: LocalizedStringResource = "레시피 · 메모"
    static var description = IntentDescription("보여줄 레시피나 메모를 골라요.")

    @Parameter(title: "보여줄 것", default: .recipe)
    var kind: BoardKind

    /// 고르지 않으면 "오늘의 레시피": 아직 못 외운 메뉴를 날마다 하나씩.
    @Parameter(title: "레시피")
    var recipe: RecipeEntity?

    @Parameter(title: "용량 가리기", default: false)
    var hide: Bool

    static var parameterSummary: some ParameterSummary {
        When(\.$kind, .equalTo, .recipe) {
            Summary { \.$kind; \.$recipe; \.$hide }
        } otherwise: {
            Summary { \.$kind }
        }
    }
}

@available(iOS 17.0, *)
struct BoardEntry: TimelineEntry {
    let date: Date
    let summary: Summary?
    let kind: BoardKind
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
struct BoardProvider: AppIntentTimelineProvider {

    func placeholder(in context: Context) -> BoardEntry {
        BoardEntry(date: Date(), summary: nil, kind: .recipe, recipeID: nil, hide: false)
    }

    func snapshot(for configuration: BoardIntent, in context: Context) async -> BoardEntry {
        BoardEntry(date: Date(), summary: Summary.load(), kind: configuration.kind,
                   recipeID: configuration.recipe?.id, hide: configuration.hide)
    }

    /// 지금과 앞으로 이레의 자정마다 한 장씩("오늘의 레시피"가 날마다 바뀐다).
    /// 앱이 레시피 · 메모를 고치면 그때 바로 다시 그린다(WidgetBridge 가 reloadAllTimelines).
    func timeline(for configuration: BoardIntent, in context: Context) async -> Timeline<BoardEntry> {
        let summary = Summary.load()
        let cal = Calendar.current
        let now = Date()
        var dates = [now]
        let midnight = cal.startOfDay(for: now)
        for i in 1...7 { if let d = cal.date(byAdding: .day, value: i, to: midnight) { dates.append(d) } }
        let entries = dates.map {
            BoardEntry(date: $0, summary: summary, kind: configuration.kind,
                       recipeID: configuration.recipe?.id, hide: configuration.hide)
        }
        return Timeline(entries: entries, policy: .atEnd)
    }
}

@available(iOS 17.0, *)
struct BoardView: View {
    let entry: BoardEntry

    var body: some View {
        Group {
            if entry.summary == nil || (!entry.summary!.hasBoard && !entry.summary!.locked) {
                note("앱을 열어 주츄", "암기쥐를 한 번 열면 레시피와 메모가 여기에 보여요.")
            } else if entry.summary!.locked {
                note("잠금을 건 앱이에요", "PIN 잠금을 쓰는 동안에는 레시피와 메모를 위젯에 내보내지 않아요.")
            } else if entry.kind == .memo {
                memoBoard(entry.summary!.memos)
            } else if let r = entry.recipe {
                recipeBoard(r.0, picked: r.picked)
            } else {
                note("레시피를 넣어 보츄", "앱에서 레시피를 넣으면 여기에 보여요.")
            }
        }
        .padding(16)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
        .widgetBackground(Ink.bg)
    }

    private func label(_ text: String) -> some View {
        Text(text)
            .font(.system(size: 11, weight: .bold, design: .rounded))
            .foregroundColor(Ink.muted)
    }

    private func note(_ title: String, _ body: String) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(title).font(.system(size: 20, weight: .heavy, design: .rounded)).foregroundColor(Ink.text)
            Text(body).font(.system(size: 14, weight: .medium, design: .rounded)).foregroundColor(Ink.muted)
            Spacer(minLength: 0)
            HStack { Spacer(); mouse(width: 56, height: 80) }
        }
    }

    private func mouse(width: CGFloat, height: CGFloat) -> some View {
        let s = entry.summary
        let rows = s?.faces["normal"] ?? Fallback.rows
        let pal = (s?.pal.isEmpty ?? true) ? Fallback.pal : s!.pal
        return PixelMouse(rows: rows, pal: pal).frame(width: width, height: height)
    }

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

    /// 메모: 고정한 것부터 여섯 개까지.
    private func memoBoard(_ memos: [Summary.Memo]) -> some View {
        VStack(alignment: .leading, spacing: 0) {
            label("메모")
            if memos.isEmpty {
                Text("아직 메모가 없어요")
                    .font(.system(size: 16, weight: .heavy, design: .rounded))
                    .foregroundColor(Ink.text)
                    .padding(.top, 4)
            }
            ForEach(0..<min(memos.count, 6), id: \.self) { i in
                HStack(alignment: .firstTextBaseline, spacing: 6) {
                    Text(memos[i].p ? "★" : "·")
                        .font(.system(size: 13, weight: .heavy, design: .rounded))
                        .foregroundColor(memos[i].p ? Ink.accent : Ink.muted)
                        .frame(width: 12, alignment: .leading)
                    Text(memos[i].t)
                        .font(.system(size: 14, weight: .medium, design: .rounded))
                        .foregroundColor(Ink.text)
                        .lineLimit(2)
                }
                .padding(.vertical, 5)
                .frame(maxWidth: .infinity, alignment: .leading)
                .overlay(Rectangle().fill(Ink.track).frame(height: 1), alignment: .bottom)
            }
            Spacer(minLength: 0)
            HStack { Spacer(); mouse(width: 42, height: 60) }
        }
    }
}

@available(iOS 17.0, *)
struct RecipeWidget: Widget {
    var body: some WidgetConfiguration {
        AppIntentConfiguration(kind: "AmgijwiBoard", intent: BoardIntent.self, provider: BoardProvider()) { entry in
            BoardView(entry: entry)
        }
        .configurationDisplayName("레시피 · 메모")
        .description("고른 레시피나 메모를 크게 보여줘요. 위젯을 길게 눌러 편집에서 골라요.")
        .supportedFamilies([.systemLarge])
        .contentMarginsDisabled()
    }
}
