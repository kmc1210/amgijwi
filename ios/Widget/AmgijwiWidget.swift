import WidgetKit
import SwiftUI

/// 암기쥐 홈 화면 위젯. 쥐돌이와 오늘 외울 잔 수를 보여주고,
/// 앱을 며칠 안 열면 쥐돌이 얼굴이 바뀐다(3일 삐침 · 5일 시무룩 · 7일 풀이 죽음 — 앱의 www/js/waiting.js 와 같은 기준).
///
/// 위젯은 앱의 저장소를 읽지 못한다. 앱이 같이 쓰는 칸(App Group)에 적어 둔 요약만 본다
/// (Sources/WidgetBridge.swift · www/js/widget.js). 쥐돌이 그림도 요약에 들어 있어, 옷장에서 입힌 옷 그대로 그린다.
/// 며칠째인지는 그리는 날짜로 스스로 센다. 그래서 앱을 열지 않아도 자정마다 얼굴이 바뀐다. 통신은 없다.

private let group = "group.com.amgijwi.app"     // WidgetBridge.group 과 같아야 한다
private let key = "summary"

/// 앱이 넘긴 요약. 모양은 www/js/widget.js 의 widgetSummary 와 같다.
struct Summary: Codable {
    var total: Int
    var done: Int
    var streak: Int
    var cheese: Int
    var last: String        // 마지막으로 앱을 연 날 "YYYY-MM-DD"
    var studied: String     // 마지막으로 한 바퀴 돈 날
    var faces: [String: [String]]
    var pal: [String: String]
    var kill: Int?          // 오늘 폐기할 개수(killDay 인 날에만 맞는 값)
    var killDay: String?
    var events: [Event]?    // 끝나지 않은 일정, 가까운 것부터

    struct Event: Codable {
        var t: String       // 제목
        var d: String       // 시작하는 날
        var e: String       // 끝나는 날(하루짜리면 d 와 같다)
    }

    static func load() -> Summary? {
        guard let text = UserDefaults(suiteName: group)?.string(forKey: key),
              let data = text.data(using: .utf8) else { return nil }
        return try? JSONDecoder().decode(Summary.self, from: data)
    }
}

/// 그 날짜에 위젯이 보여줄 것.
struct Look {
    var face: String        // faces 의 이름: normal · happy · sulk · sad · down
    var title: String
    var big: String?
    var note: String
}

struct MouseEntry: TimelineEntry {
    let date: Date
    let summary: Summary?
}

private let dayFormat: DateFormatter = {
    let f = DateFormatter()
    f.locale = Locale(identifier: "en_US_POSIX")
    f.calendar = Calendar(identifier: .gregorian)
    f.dateFormat = "yyyy-MM-dd"
    return f
}()

extension MouseEntry {

    /// 마지막으로 연 날부터 며칠째인가. 날짜가 없으면 0.
    var daysAway: Int {
        guard let s = summary, let last = dayFormat.date(from: s.last) else { return 0 }
        let cal = Calendar(identifier: .gregorian)
        let d = cal.dateComponents([.day], from: cal.startOfDay(for: last), to: cal.startOfDay(for: date)).day ?? 0
        return max(0, d)
    }

    var look: Look {
        guard let s = summary else {
            return Look(face: "normal", title: "암기쥐를\n열어 주세요", big: nil, note: "")
        }
        let n = daysAway
        let left = max(0, s.total - s.done)
        if s.studied == dayFormat.string(from: date) {
            /// 작은 위젯은 쥐돌이 옆 자리가 좁다. 한 가지만 적는다(연속 접속이 있으면 그것, 없으면 치즈).
            return Look(face: "happy", title: "오늘\n외웠츄!", big: nil,
                        note: s.streak >= 2 ? "\(s.streak)일 연속" : "치즈 \(s.cheese)")
        }
        if n >= 7 { return Look(face: "down", title: "보고\n싶츄…", big: nil, note: "\(n)일째") }
        if n >= 5 { return Look(face: "sad", title: "\(n)일째\n기다렸츄", big: nil, note: "") }
        if n >= 3 { return Look(face: "sulk", title: "\(n)일째\n기다렸츄", big: nil, note: "흥…") }
        if s.total == 0 { return Look(face: "normal", title: "레시피를\n넣어 보츄", big: nil, note: "치즈 \(s.cheese)") }
        if left == 0 { return Look(face: "happy", title: "전부\n외웠츄!", big: nil, note: "치즈 \(s.cheese)") }
        return Look(face: "normal", title: "오늘 외울", big: "\(left)잔", note: "치즈 \(s.cheese)")
    }

    /// 오늘 폐기할 것이 있으면 한 줄. 앱이 센 날(killDay)에만 보여준다 — 다음 날에는 맞지 않는 수다.
    var killLine: String? {
        guard let s = summary, let n = s.kill, n > 0, s.killDay == dayFormat.string(from: date) else { return nil }
        return "오늘 폐기 \(n)개"
    }

    /// 가장 가까운 일정 한 줄: "D-3 신메뉴 출시" · "오늘 신메뉴 출시" · "진행 중 가을 행사".
    var eventLine: String? {
        guard let s = summary, let list = s.events else { return nil }
        let cal = Calendar(identifier: .gregorian)
        let today = cal.startOfDay(for: date)
        for ev in list {
            guard let start = dayFormat.date(from: ev.d), let end = dayFormat.date(from: ev.e) else { continue }
            if cal.startOfDay(for: end) < today { continue }        // 이 위젯이 그려지는 날에는 이미 끝났다
            let left = cal.dateComponents([.day], from: today, to: cal.startOfDay(for: start)).day ?? 0
            let head = left > 0 ? "D-\(left)" : (ev.d == ev.e ? "오늘" : "진행 중")
            return head + " " + ev.t
        }
        return nil
    }

    /// 외운 비율(0~1).
    var progress: Double {
        guard let s = summary, s.total > 0 else { return 0 }
        return min(1, Double(s.done) / Double(s.total))
    }
}

struct Provider: TimelineProvider {

    func placeholder(in context: Context) -> MouseEntry {
        MouseEntry(date: Date(), summary: nil)
    }

    func getSnapshot(in context: Context, completion: @escaping (MouseEntry) -> Void) {
        completion(MouseEntry(date: Date(), summary: Summary.load()))
    }

    /// 지금과, 앞으로 여드레 동안의 자정마다 한 장씩. 날이 바뀌면 며칠째인지 · 얼굴이 달라진다.
    /// 앱이 요약을 고치면 그때 바로 다시 그린다(WidgetBridge 가 reloadAllTimelines).
    func getTimeline(in context: Context, completion: @escaping (Timeline<MouseEntry>) -> Void) {
        let summary = Summary.load()
        let cal = Calendar.current
        let now = Date()
        var entries = [MouseEntry(date: now, summary: summary)]
        let midnight = cal.startOfDay(for: now)
        for i in 1...8 {
            if let d = cal.date(byAdding: .day, value: i, to: midnight) {
                entries.append(MouseEntry(date: d, summary: summary))
            }
        }
        completion(Timeline(entries: entries, policy: .atEnd))
    }
}

/// 쥐돌이 도트 그림. 한 줄이 글자 28개, 글자마다 색(pal)이 있고 "." 은 빈칸이다.
struct PixelMouse: View {
    let rows: [String]
    let pal: [String: String]

    var body: some View {
        Canvas { ctx, size in
            guard let w = rows.first?.count, w > 0, !rows.isEmpty else { return }
            /// 칸이 고르게 보이도록 정수 배로만 키운다.
            let cell = max(1, floor(min(size.width / CGFloat(w), size.height / CGFloat(rows.count))))
            let x0 = (size.width - cell * CGFloat(w)) / 2
            let y0 = size.height - cell * CGFloat(rows.count)        // 발이 아래에 붙게
            for (y, row) in rows.enumerated() {
                for (x, ch) in row.enumerated() where ch != "." {
                    guard let hex = pal[String(ch)], let color = Color(hex: hex) else { continue }
                    let r = CGRect(x: x0 + CGFloat(x) * cell, y: y0 + CGFloat(y) * cell, width: cell, height: cell)
                    ctx.fill(Path(r), with: .color(color))
                }
            }
        }
    }
}

extension Color {
    /// "#RRGGBB"
    init?(hex: String) {
        var s = hex
        if s.hasPrefix("#") { s.removeFirst() }
        guard s.count == 6, let v = UInt32(s, radix: 16) else { return nil }
        self.init(red: Double((v >> 16) & 0xFF) / 255, green: Double((v >> 8) & 0xFF) / 255, blue: Double(v & 0xFF) / 255)
    }
}

/// 앱의 기본 테마 색(크림 바탕 · 짙은 글씨 · 갈색 강조).
private enum Ink {
    static let bg = Color(hex: "#F3E9DC")!
    static let text = Color(hex: "#241F1A")!
    static let muted = Color(hex: "#7A6D62")!
    static let accent = Color(hex: "#A65E2E")!
    static let track = Color(hex: "#E4D6C4")!
    static let line = Color(hex: "#4A423A")!
    static let alert = Color(hex: "#B5453C")!
}

/// 요약이 아직 없을 때(앱을 한 번도 안 열었을 때) 그릴 기본 쥐돌이는 없다. 글만 보여준다.
struct MouseWidgetView: View {
    @Environment(\.widgetFamily) private var family
    let entry: MouseEntry

    var body: some View {
        let look = entry.look
        let rows = entry.summary?.faces[look.face] ?? entry.summary?.faces["normal"] ?? []
        let pal = entry.summary?.pal ?? [:]
        let medium = family == .systemMedium
        ZStack(alignment: .bottomTrailing) {
            /// 글은 왼쪽 위에서부터, 쥐돌이는 오른쪽 아래에 서 있다. 겹쳐 두어야 좁은 위젯에서도 글이 한 줄에 들어간다.
            VStack(alignment: .leading, spacing: 3) {
                Text(look.title)
                    .font(.system(size: 17, weight: .heavy, design: .rounded))
                    .foregroundColor(Ink.text)
                    .fixedSize(horizontal: false, vertical: true)
                if let big = look.big {
                    Text(big)
                        .font(.system(size: 30, weight: .heavy, design: .rounded))
                        .foregroundColor(Ink.text)
                        .lineLimit(1)
                }
                if medium, entry.summary != nil {
                    ProgressBar(value: entry.progress)
                        .frame(width: 150, height: 10)
                        .padding(.top, 3)
                    Text("외운 잔 \(Int((entry.progress * 100).rounded()))%"
                         + ((entry.summary?.streak ?? 0) >= 2 ? " · \(entry.summary!.streak)일 연속" : ""))
                        .font(.system(size: 12, weight: .semibold, design: .rounded))
                        .foregroundColor(Ink.muted)
                }
                Spacer(minLength: 0)
                /// 중간 크기에는 오늘 챙길 것 두 줄: 폐기할 재료와 가장 가까운 일정
                if medium {
                    if let kill = entry.killLine {
                        Text(kill)
                            .font(.system(size: 13, weight: .bold, design: .rounded))
                            .foregroundColor(Ink.alert)
                            .lineLimit(1)
                    }
                    if let ev = entry.eventLine {
                        Text(ev)
                            .font(.system(size: 13, weight: .bold, design: .rounded))
                            .foregroundColor(Ink.accent)
                            .lineLimit(1)
                            .frame(maxWidth: 200, alignment: .leading)
                    }
                }
                if !look.note.isEmpty {
                    Text(look.note)
                        .font(.system(size: 12, weight: .semibold, design: .rounded))
                        .foregroundColor(Ink.muted)
                        .lineLimit(1)
                        .frame(maxWidth: medium ? 200 : 58, alignment: .leading)     // 쥐돌이를 덮지 않게
                }
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
            PixelMouse(rows: rows, pal: pal)
                .frame(width: medium ? 100 : 78, height: medium ? 128 : 104)
        }
        .padding(medium ? 16 : 14)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .widgetBackground(Ink.bg)
    }
}

/// 외운 비율 막대. 앱의 도트 막대처럼 모서리가 각지다.
struct ProgressBar: View {
    let value: Double
    var body: some View {
        GeometryReader { geo in
            ZStack(alignment: .leading) {
                Rectangle().fill(Ink.track)
                Rectangle().fill(Ink.accent).frame(width: geo.size.width * CGFloat(value))
            }
            .overlay(Rectangle().stroke(Ink.line, lineWidth: 2))
        }
    }
}

extension View {
    /// iOS 17 부터는 위젯 바탕을 이렇게 알려줘야 한다(안 그러면 "바탕을 정하라"는 안내가 뜬다).
    @ViewBuilder func widgetBackground(_ color: Color) -> some View {
        if #available(iOSApplicationExtension 17.0, *) {
            containerBackground(color, for: .widget)
        } else {
            background(color)
        }
    }
}

@main
struct AmgijwiWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "AmgijwiMouse", provider: Provider()) { entry in
            MouseWidgetView(entry: entry)
        }
        .configurationDisplayName("쥐돌이")
        .description("오늘 외울 잔 수와 쥐돌이를 보여줘요. 며칠 안 오면 쥐돌이가 기다려요.")
        .supportedFamilies([.systemSmall, .systemMedium])
        .contentMarginsDisabledIfAvailable()
    }
}

extension WidgetConfiguration {
    /// iOS 17 이 위젯 둘레에 여백을 한 겹 더 넣는다. 안쪽 여백을 직접 주고 있어서 끈다.
    func contentMarginsDisabledIfAvailable() -> some WidgetConfiguration {
        if #available(iOSApplicationExtension 17.0, *) {
            return contentMarginsDisabled()
        } else {
            return self
        }
    }
}
