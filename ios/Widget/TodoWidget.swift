import WidgetKit
import SwiftUI
import AppIntents

/// 할 일 위젯(작은 · 중간 · 큰 크기). 앱의 주간 할 일(www/js/todo.js) 가운데 오늘 요일 것을 보여주고,
/// iOS 17 부터는 할 일을 눌러 앱을 열지 않고 바로 체크한다. 그 아래 버전에서는 보기만 하고, 누르면 앱이 열린다.
///   작은 크기: 오늘 할 일 넉 줄까지(안 한 것이 위로) · 다 하면 "다 했츄!"
///   중간 크기: 누르기 쉬운 큰 줄로 두 줄 × 두 칸, 넷까지 + 이번 주 요일마다 한 수(점)
///   큰 크기: 큰 줄로 한 줄씩 여섯까지 + 이번 주 점
///   중간 · 큰 크기는 다 들어가면 앱에 적힌 차례 그대로(누른 줄이 자리를 옮기지 않게), 넘칠 때만 안 한 것을 위로
/// 할 일과 이번 주 체크는 앱이 적어 둔 요약의 todo 에서 읽고, 위젯에서 누른 것은 기록(TodoLog)으로 쌓아 그 위에 얹는다.
/// 앱을 열면 앱이 그 기록을 가져가 저장하고, 어디까지 받았는지(todoTaken)만 적는다(Sources/WidgetBridge.swift 의 TodoBridge).
/// 기록 칸은 위젯만 고친다 — 받은 것은 다음에 누를 때 위젯이 걷는다. 두 프로세스가 같은 칸을 읽고 고쳐 쓰다 기록을 잃지 않게.
/// 어느 요일인지 · 이번 주가 언제인지는 그리는 날짜로 정한다. 한 주는 월요일부터다(체크는 날짜로 적혀 있어 새 주엔 저절로 풀린다).

/// 위젯에서 누른 기록. 앱(TodoBridge)이 같은 키 · 모양으로 읽는다.
enum TodoLog {
    static let key = "todoLog"
    static let takenKey = "todoTaken"   // 앱이 어디까지 받았나(누른 때 ms). 앱만 쓴다
    /// 앱을 오래 안 열어도 이만큼만 남긴다(오래된 것부터 버린다).
    static let limit = 300

    struct Entry: Codable {
        var id: String      // 할 일
        var d: String       // 그 할 일의 날 "YYYY-MM-DD"
        var on: Bool        // 체크했나 풀었나
        var at: Double      // 누른 때(1970 부터 ms) — 앱이 어디까지 가져갔는지 견준다
    }

    static func load() -> [Entry] {
        guard let text = UserDefaults(suiteName: group)?.string(forKey: key),
              let data = text.data(using: .utf8) else { return [] }
        return (try? JSONDecoder().decode([Entry].self, from: data)) ?? []
    }

    static func save(_ list: [Entry]) {
        guard let data = try? JSONEncoder().encode(Array(list.suffix(limit))),
              let text = String(data: data, encoding: .utf8) else { return }
        UserDefaults(suiteName: group)?.set(text, forKey: key)
    }

    /// 요약의 체크에 기록을 차례대로 얹은 것. 앱에서 그 칸을 더 나중에 바꿨으면(todo.at) 그 기록은 얹지 않는다.
    static func done(_ summary: Summary?, _ log: [Entry]) -> Set<String> {
        var set = Set(summary?.todo.done ?? [])
        let at = summary?.todo.at ?? [:]
        for e in log where e.at > (at[e.d + "|" + e.id] ?? 0) {
            if e.on { set.insert(e.d + "|" + e.id) } else { set.remove(e.d + "|" + e.id) }
        }
        return set
    }

    /// 누른 할 일을 뒤집는다. 오늘 칸만 — 자정이 막 지나 어제 화면이 아직 떠 있을 때 누른 것은 버린다(누르면 위젯이 다시 그려져 오늘이 된다).
    /// 앱이 이미 받아 간 기록은 이때 걷는다.
    static func toggle(id: String, day: String) {
        guard day == dayFormat.string(from: Date()) else { return }
        let taken = UserDefaults(suiteName: group)?.double(forKey: takenKey) ?? 0
        var log = load().filter { $0.at > taken }
        let on = !done(Summary.load(), load()).contains(day + "|" + id)
        log.append(Entry(id: id, d: day, on: on, at: (Date().timeIntervalSince1970 * 1000).rounded()))
        save(log)
    }
}

/// 할 일을 누르면 위젯 안에서 체크한다(iOS 17). 앱을 열지 않는다.
@available(iOS 17.0, *)
struct ToggleTodoIntent: AppIntent {
    static var title: LocalizedStringResource = "할 일 체크"
    static var isDiscoverable = false

    @Parameter(title: "할 일") var id: String
    @Parameter(title: "날") var day: String

    init() {}
    init(id: String, day: String) {
        self.id = id
        self.day = day
    }

    func perform() async throws -> some IntentResult {
        TodoLog.toggle(id: id, day: day)
        return .result()
    }
}

struct TodoEntry: TimelineEntry {
    let date: Date
    let summary: Summary?
    let log: [TodoLog.Entry]
}

/// 오늘 할 일 한 줄.
struct TodoRow: Identifiable {
    let id: String
    let title: String
    let done: Bool
}

extension TodoEntry {
    static let dow = ["월", "화", "수", "목", "금", "토", "일"]

    private var cal: Calendar {
        var c = Calendar(identifier: .gregorian)
        c.timeZone = .current
        return c
    }

    /// 0(월) ~ 6(일)
    var dowIndex: Int { (cal.component(.weekday, from: date) + 5) % 7 }
    var todayKey: String { dayFormat.string(from: date) }

    /// 이번 주 월요일부터 일요일까지 "YYYY-MM-DD".
    var weekKeys: [String] {
        let mon = cal.date(byAdding: .day, value: -dowIndex, to: cal.startOfDay(for: date)) ?? date
        return (0..<7).map { dayFormat.string(from: cal.date(byAdding: .day, value: $0, to: mon) ?? mon) }
    }

    private var doneSet: Set<String> { TodoLog.done(summary, log) }

    /// 그 요일 할 일과 체크. 앱에 적힌 차례 그대로.
    func rows(_ key: String, dow: Int, done: Set<String>) -> [TodoRow] {
        guard let s = summary, !s.locked else { return [] }
        return s.todo.items.filter { $0.days.contains(dow) }.map { TodoRow(id: $0.id, title: $0.t, done: done.contains(key + "|" + $0.id)) }
    }

    var today: [TodoRow] { rows(todayKey, dow: dowIndex, done: doneSet) }

    /// 요일마다 (할 일 수, 한 수).
    var week: [(Int, Int)] {
        let done = doneSet
        return weekKeys.enumerated().map { i, key in
            let r = rows(key, dow: i, done: done)
            return (r.count, r.filter { $0.done }.count)
        }
    }

    /// 할 일 자리에 대신 적을 안내. 보여줄 수 있으면 nil.
    var note: String? {
        guard let s = summary, s.hasTodo || s.locked else { return "암기쥐를 한 번 열면\n할 일이 여기에 보여요." }
        if s.locked { return "PIN 잠금을 쓰는 동안에는\n할 일을 내보내지 않아요." }
        return nil
    }
}

struct TodoProvider: TimelineProvider {
    func placeholder(in context: Context) -> TodoEntry {
        TodoEntry(date: Date(), summary: nil, log: [])
    }

    func getSnapshot(in context: Context, completion: @escaping (TodoEntry) -> Void) {
        completion(TodoEntry(date: Date(), summary: Summary.load(), log: TodoLog.load()))
    }

    /// 지금과, 앞으로 여드레 동안의 자정마다 한 장씩(요일이 바뀌면 오늘 목록이, 월요일엔 체크가 바뀐다).
    /// 앱이 요약을 고치거나 위젯에서 누르면 그때 바로 다시 그린다.
    func getTimeline(in context: Context, completion: @escaping (Timeline<TodoEntry>) -> Void) {
        let summary = Summary.load(), log = TodoLog.load()
        let cal = Calendar.current
        let now = Date()
        var entries = [TodoEntry(date: now, summary: summary, log: log)]
        let midnight = cal.startOfDay(for: now)
        for i in 1...8 {
            if let d = cal.date(byAdding: .day, value: i, to: midnight) {
                entries.append(TodoEntry(date: d, summary: summary, log: log))
            }
        }
        completion(Timeline(entries: entries, policy: .atEnd))
    }
}

/// 도트 체크 표시(7×7 칸). 앱의 todo.js TODO_CHECK 와 같은 그림이다.
struct PixelCheck: Shape {
    private static let cells: [(Int, Int, Int)] = [(0, 3, 2), (1, 4, 2), (2, 5, 2), (3, 4, 2), (4, 3, 2), (5, 2, 2), (6, 1, 2)]   // (x, y, 높이)
    func path(in rect: CGRect) -> Path {
        let u = min(rect.width, rect.height) / 7
        var p = Path()
        for (x, y, h) in Self.cells {
            p.addRect(CGRect(x: rect.minX + CGFloat(x) * u, y: rect.minY + CGFloat(y) * u, width: u, height: CGFloat(h) * u))
        }
        return p
    }
}

/// 체크 네모. 앱의 도트 네모처럼 각지다.
struct TodoBox: View {
    let done: Bool
    var size: CGFloat = 16
    var body: some View {
        ZStack {
            Rectangle().fill(done ? Ink.accent : Ink.surface)
            Rectangle().strokeBorder(done ? Ink.accentDark : Ink.line, lineWidth: max(2, size / 8))
            if done {
                PixelCheck().fill(Ink.onAccent).padding(size * 0.22)
            }
        }
        .frame(width: size, height: size)
    }
}

struct TodoWidgetView: View {
    @Environment(\.widgetFamily) private var family
    let entry: TodoEntry

    var body: some View {
        let small = family == .systemSmall
        let rows = entry.today
        let done = rows.filter { $0.done }.count
        VStack(alignment: .leading, spacing: small ? 6 : 8) {
            HStack(alignment: .firstTextBaseline) {
                Text(small ? "오늘 할 일" : "\(TodoEntry.dow[entry.dowIndex])요일 할 일")
                    .font(.system(size: 14, weight: .heavy, design: .rounded))
                    .foregroundColor(Ink.text)
                    .lineLimit(1)
                Spacer(minLength: 4)
                if entry.note == nil && !rows.isEmpty {
                    /// 다 했으면 칭찬 한마디. 목록은 그대로 둔다 — 잘못 누른 것을 위젯에서 바로 되돌릴 수 있게
                    Text(done == rows.count ? "다 했츄!" : "\(done)/\(rows.count)")
                        .font(.system(size: 14, weight: .heavy, design: .rounded))
                        .foregroundColor(Ink.accent)
                }
            }
            if let note = entry.note {
                Text(note)
                    .font(.system(size: 12, weight: .medium, design: .rounded))
                    .foregroundColor(Ink.muted)
                Spacer(minLength: 0)
            } else if rows.isEmpty {
                Text("오늘은 할 일이 없어요")
                    .font(.system(size: 12.5, weight: .medium, design: .rounded))
                    .foregroundColor(Ink.muted)
                Spacer(minLength: 0)
            } else {
                switch family {
                case .systemSmall:
                    smallList(rows)
                    Spacer(minLength: 0)
                case .systemMedium:
                    mediumList(rows)
                    Spacer(minLength: 0)
                    weekRow
                default:
                    largeList(rows)
                    Spacer(minLength: 0)
                    weekRow
                }
            }
        }
        .padding(14)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
        .widgetBackground(Ink.bg)
        .widgetURL(WidgetLink.todo)
    }

    /// 작은 크기: 안 한 것을 위로, 넉 줄까지(넘치면 석 줄 + "외 N개").
    @ViewBuilder private func smallList(_ rows: [TodoRow]) -> some View {
        let ordered = undoneFirst(rows)
        let shown = ordered.count > 4 ? Array(ordered.prefix(3)) : ordered
        VStack(alignment: .leading, spacing: 7) {
            ForEach(shown) { row($0) }
            if ordered.count > shown.count { more(ordered.count - shown.count) }
        }
    }

    /// 안 한 것을 위로.
    private func undoneFirst(_ rows: [TodoRow]) -> [TodoRow] {
        rows.filter { !$0.done } + rows.filter { $0.done }
    }

    /// 큰 줄 목록에 보일 것: 다 들어가면 앱 차례 그대로 — 누른 줄이 움직이면 이어 누를 때 엉뚱한 줄이 눌린다.
    /// 넘칠 때만 안 한 것을 위로(남은 일이 "외 N개" 뒤에 숨지 않게).
    private func bigShown(_ rows: [TodoRow], fit: Int) -> (shown: [TodoRow], rest: Int) {
        if rows.count <= fit { return (rows, 0) }
        let shown = Array(undoneFirst(rows).prefix(fit - 1))
        return (shown, rows.count - shown.count)
    }

    /// 중간 크기: 누르기 쉬운 큰 줄로 두 줄 × 두 칸, 넷까지(넘치면 셋 + "외 N개").
    @ViewBuilder private func mediumList(_ rows: [TodoRow]) -> some View {
        let (shown, rest) = bigShown(rows, fit: 4)
        let left = Array(shown.prefix(2)), right = Array(shown.dropFirst(2))
        HStack(alignment: .top, spacing: 8) {
            VStack(alignment: .leading, spacing: 6) { ForEach(left) { bigRow($0, large: false) } }
                .frame(maxWidth: .infinity, alignment: .leading)
            VStack(alignment: .leading, spacing: 6) {
                ForEach(right) { bigRow($0, large: false) }
                if rest > 0 { bigMore(rest, large: false) }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
        }
    }

    /// 큰 크기: 한 줄씩 여섯 개까지(넘치면 다섯 + "외 N개").
    @ViewBuilder private func largeList(_ rows: [TodoRow]) -> some View {
        let (shown, rest) = bigShown(rows, fit: 6)
        VStack(alignment: .leading, spacing: 6) {
            ForEach(shown) { bigRow($0, large: true) }
            if rest > 0 { bigMore(rest, large: true) }
        }
    }

    private func moreText(_ n: Int, size: CGFloat) -> some View {
        Text("외 \(n)개")
            .font(.system(size: size, weight: .semibold, design: .rounded))
            .foregroundColor(Ink.muted)
    }

    private func more(_ n: Int) -> some View { moreText(n, size: 11.5) }

    /// 큰 줄 목록의 "외 N개". 한 줄과 같은 칸에 넣는다 — 중간 크기는 두 칸이 같은 차림이라야 줄이 줄어들 때 양쪽 높이가 같고,
    /// 큰 크기는 다섯 줄 + "외 N개" 가 여섯 줄과 같은 높이를 차지해야 아래 요일 점 자리가 그대로다.
    private func bigMore(_ n: Int, large: Bool) -> some View {
        moreText(n, size: 13)
            .padding(.horizontal, 8)
            .bigRowFrame(large: large)
    }

    /// 한 줄. iOS 17 부터는 눌러서 바로 체크한다.
    @ViewBuilder private func row(_ r: TodoRow) -> some View {
        let label = HStack(spacing: 7) {
            TodoBox(done: r.done)
            Text(r.title)
                .font(.system(size: 13, weight: .semibold, design: .rounded))
                .strikethrough(r.done)
                .foregroundColor(r.done ? Ink.muted : Ink.text)
                .lineLimit(1)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .contentShape(Rectangle())
        toggle(r, label)
    }

    /// 중간 · 큰 크기의 한 줄. 줄 전체가 누르는 칸이라 손가락으로 누르기 쉽다.
    /// 높이는 중간 36 · 큰 40 까지 — 위젯이 낮은 기기(SE · 아이패드)에선 요일 점이 잘리지 않게 그보다 줄어든다.
    private func bigRow(_ r: TodoRow, large: Bool) -> some View {
        let label = HStack(spacing: 8) {
            TodoBox(done: r.done, size: large ? 24 : 22)
            Text(r.title)
                .font(.system(size: large ? 16 : 15, weight: .semibold, design: .rounded))
                .strikethrough(r.done)
                .foregroundColor(r.done ? Ink.muted : Ink.text)
                .lineLimit(1)
                .minimumScaleFactor(0.85)
        }
        .padding(.horizontal, 8)
        .bigRowFrame(large: large)
        .background(Ink.accent.opacity(0.1))
        .contentShape(Rectangle())
        return toggle(r, label)
    }

    @ViewBuilder private func toggle<L: View>(_ r: TodoRow, _ label: L) -> some View {
        if #available(iOSApplicationExtension 17.0, *) {
            Button(intent: ToggleTodoIntent(id: r.id, day: entry.todayKey)) { label }
                .buttonStyle(.plain)
        } else {
            label
        }
    }

    /// 이번 주 요일마다 점(할 일 하나에 점 하나, 한 것은 진하게). 오늘은 테두리.
    private var weekRow: some View {
        let week = entry.week
        return HStack(spacing: 3) {
            ForEach(0..<7, id: \.self) { i in
                let (all, done) = week[i]
                VStack(spacing: 3) {
                    Text(TodoEntry.dow[i])
                        .font(.system(size: 10, weight: .bold, design: .rounded))
                        .foregroundColor(i == entry.dowIndex ? Ink.accent : Ink.muted)
                    HStack(spacing: 2) {
                        ForEach(0..<min(all, 6), id: \.self) { j in
                            Rectangle()
                                .fill(all > 0 && done == all ? Ink.accent.opacity(0.55) : (j < done ? Ink.accent : Ink.track))
                                .frame(width: 4, height: 4)
                        }
                    }
                    .frame(height: 4)
                }
                .padding(.vertical, 3)
                .frame(maxWidth: .infinity)
                .overlay(Rectangle().strokeBorder(i == entry.dowIndex ? Ink.accent : Color.clear, lineWidth: 2))
            }
        }
    }
}

struct TodoWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "AmgijwiTodo", provider: TodoProvider()) { entry in
            TodoWidgetView(entry: entry)
        }
        .configurationDisplayName("할 일")
        .description("오늘 할 일과 이번 주 진행을 보여줘요. 할 일을 누르면 바로 체크돼요(iOS 17 이상).")
        .supportedFamilies([.systemSmall, .systemMedium, .systemLarge])
        .contentMarginsDisabledIfAvailable()
    }
}

private extension View {
    /// 큰 줄 한 칸의 높이. 중간 36 · 큰 40 까지, 위젯이 낮으면 26 까지 줄어든다(bigRow · bigMore 가 같이 쓴다).
    func bigRowFrame(large: Bool) -> some View {
        frame(maxWidth: .infinity, minHeight: 26, maxHeight: large ? 40 : 36, alignment: .leading)
    }
}
