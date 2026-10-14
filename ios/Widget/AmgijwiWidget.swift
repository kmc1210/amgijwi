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
struct Summary: Decodable {
    var total = 0
    var done = 0
    var streak = 0
    var cheese = 0
    var last = ""           // 마지막으로 앱을 연 날 "YYYY-MM-DD"
    var studied = ""        // 마지막으로 한 바퀴 돈 날
    var kill = 0            // 오늘 폐기를 챙길 재료 수
    var events: [Event] = []    // 끝나지 않은 일정
    /// 달력 위젯이 그릴 일정(이번 달 첫날부터의 끝나지 않은 일정, 날짜순). PIN 잠금을 걸었으면 비어 있다.
    var cal: [Event] = []
    /// 요약에 달력 칸이 들어 있는가. 달력 위젯이 생기기 전의 앱이 적어 둔 요약에는 없다.
    var hasCal = false
    var faces: [String: [String]] = [:]
    var pal: [String: String] = [:]
    /// 큰 위젯에 보여줄 레시피와 메모. 앱에 PIN 잠금을 걸었으면 비어 있고 locked 가 참이다.
    var locked = false
    /// 요약에 레시피 칸이 들어 있는가. 1.2 이전의 앱이 적어 둔 요약에는 없다(그때는 "앱을 열어 달라"고 한다).
    var hasBoard = false
    var recipes: [Recipe] = []
    var memos: [Memo] = []
    var memoMore = 0        // 여기 실리지 않은 메모 수

    struct Recipe: Decodable {
        var id: String
        var n: String           // 이름
        var t: String           // ICE · HOT · ICE/HOT
        var c: String           // 컵 크기
        var m: Bool             // 외운 메뉴인가
        var sets: [IngSet]      // 재료 한 벌(ICE/HOT 을 같이 파는 메뉴는 두 벌)
        var steps: [String]

        struct IngSet: Decodable {
            var l: String       // "ICE" · "HOT" · 한 벌이면 ""
            var ing: [[String]] // [이름, 용량]
            var more: Int?      // 여기 실리지 않은 재료 수
        }
    }

    struct Memo: Decodable {
        var id: String?         // 위젯에서 메모 하나를 고를 때 쓴다
        var t: String
        var p: Bool             // 고정한 메모인가
    }

    struct Event: Decodable {
        var t: String       // 제목
        var d: String       // 시작하는 날
        var e: String       // 끝나는 날(하루짜리면 d 와 같다)
    }

    enum Keys: String, CodingKey { case total, done, streak, cheese, last, studied, kill, events, cal, faces, pal, locked, recipes, memos, memoMore }

    init() {}

    /// 칸 하나가 빠지거나 모양이 달라도 나머지는 살린다. 통째로 못 읽으면 위젯이 빈 화면이 된다.
    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: Keys.self)
        total = (try? c.decode(Int.self, forKey: .total)) ?? 0
        done = (try? c.decode(Int.self, forKey: .done)) ?? 0
        streak = (try? c.decode(Int.self, forKey: .streak)) ?? 0
        cheese = (try? c.decode(Int.self, forKey: .cheese)) ?? 0
        last = (try? c.decode(String.self, forKey: .last)) ?? ""
        studied = (try? c.decode(String.self, forKey: .studied)) ?? ""
        kill = (try? c.decode(Int.self, forKey: .kill)) ?? 0
        events = (try? c.decode([Event].self, forKey: .events)) ?? []
        hasCal = c.contains(.cal)
        cal = (try? c.decode([Event].self, forKey: .cal)) ?? []
        faces = (try? c.decode([String: [String]].self, forKey: .faces)) ?? [:]
        pal = (try? c.decode([String: String].self, forKey: .pal)) ?? [:]
        locked = (try? c.decode(Bool.self, forKey: .locked)) ?? false
        hasBoard = c.contains(.recipes)
        recipes = (try? c.decode([Recipe].self, forKey: .recipes)) ?? []
        memos = (try? c.decode([Memo].self, forKey: .memos)) ?? []
        memoMore = (try? c.decode(Int.self, forKey: .memoMore)) ?? 0
    }

    static func load() -> Summary? {
        guard let text = UserDefaults(suiteName: group)?.string(forKey: key),
              let data = text.data(using: .utf8) else { return nil }
        return try? JSONDecoder().decode(Summary.self, from: data)
    }
}

/// 앱을 아직 한 번도 열지 않아 요약이 없을 때(위젯 고르는 화면의 미리보기 포함) 그릴 기본 쥐돌이.
/// www/js/core.js 의 MOUSE.day 와 같은 그림이다. 앱을 열면 옷 입은 그림으로 바뀐다.
enum Fallback {
    static let pal: [String: String] = ["o": "#C4AE98", "p": "#F5BEAC", "w": "#FCF7F1", "c": "#EBDDCD", "h": "#FFFFFF", "k": "#261F1C", "n": "#78543A", "d": "#DF9B88"]
    static let rows: [String] = [
        ".........o........o.........",
        "........opo......opo........",
        ".......opppo....opppo.......",
        ".......oppppo..oppppo.......",
        "......opppppoooopppppo......",
        "......oppppwcwwcwppppo......",
        "......oppcwwwwwwwwcppo......",
        "......owcwwwwwwwwwwcwo......",
        "......ocwwwwwwwwwwwwco......",
        "....oowcwooowwwwooowcwoo....",
        "...ocwwwohhhowwohhhowwwco...",
        "....owcwohkhowwohkhowcwo....",
        "...ocwwwohkhowwohkhowwwco...",
        "..owcwwwohhhowwohhhowwwcwo..",
        "...ocwwwwooowwwwooowwwwco...",
        "...owcwwwwwwwnnwwwwwwwcwo...",
        "..occwwwwwwwwnnwwwwwwwwcco..",
        "..owcwwwwwwwwwwwwwwwwwwcwo..",
        "..ocwwwwwwwwwwwwwwwwwwwwco..",
        "..owccwwwwwwwwwwwwwwwwccwo..",
        "...occccwwwwccccwwwwcccco...",
        "...owccccccccccccccccccwo...",
        "..ocwwwwccccwwwwccccwwwwco..",
        "..owcwwwwwwwwwwwwwwwwwwcwo..",
        ".oocwwwwwwwwwwwwwwwwwwwwcoo.",
        "owcwwwwwwwwwwwwwwwwwwwwwwcwo",
        ".ocwwwwwwwwwwwwwwwwwwwwwwco.",
        ".owppcwwwwwwwwwwwwwwwwcppwo.",
        "ocwppcwwwwwwwwwwwwwwwwcppwco",
        ".owppcwwwwwwwwwwwwwwwwcppwo.",
        ".ocddcwwwwwwwwwwwwwwwwcddco.",
        ".owcwwwwwwwwwwwwwwwwwwwwcwo.",
        "..ocwwwwwwwwwwwwwwwwwwwwco..",
        "...occwwwwwwwwwwwwwwwwcco...",
        "..occcwwwwwwwwwwwwwwwwccco..",
        "...ooccwwwwwwwwwwwwwwccoo...",
        "....ooccwwwwwwwwwwwwccoo....",
        "..oopppppcwwwwwwwwcpppppoo..",
        ".oddpppppccccccccccpppppddo.",
        "..ooooooooooccccoooooooooo.."
    ]
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

let dayFormat: DateFormatter = {
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
            return Look(face: "normal", title: "앱을\n열어 주츄", big: nil, note: "")
        }
        let n = daysAway
        let left = max(0, s.total - s.done)
        if s.studied == dayFormat.string(from: date) {
            /// 작은 위젯은 쥐돌이 옆 자리가 좁다. 한 가지만 적는다(연속 접속이 있으면 그것, 없으면 치즈).
            return Look(face: "happy", title: "오늘\n외웠츄!", big: nil,
                        note: streak >= 2 ? "\(streak)일 연속" : "치즈 \(s.cheese)")
        }
        if n >= 7 { return Look(face: "down", title: "보고\n싶츄…", big: nil, note: "\(n)일째") }
        if n >= 5 { return Look(face: "sad", title: "\(n)일째\n기다렸츄", big: nil, note: "") }
        if n >= 3 { return Look(face: "sulk", title: "\(n)일째\n기다렸츄", big: nil, note: "흥…") }
        if s.total == 0 { return Look(face: "normal", title: "레시피를\n넣어 보츄", big: nil, note: "치즈 \(s.cheese)") }
        if left == 0 { return Look(face: "happy", title: "전부\n외웠츄!", big: nil, note: "치즈 \(s.cheese)") }
        return Look(face: "normal", title: "오늘 외울", big: "\(left)잔", note: "치즈 \(s.cheese)")
    }

    /// 폐기를 챙길 재료가 있으면 한 줄. 기한을 건 재료는 날마다 폐기일이 돌아와서 날짜와 상관없이 같은 수다.
    var killLine: String? {
        guard let s = summary, s.kill > 0 else { return nil }
        return "오늘 폐기 \(s.kill)개"
    }

    /// 연속 접속은 이틀 넘게 안 오면 끊긴다. 끊긴 날의 위젯에는 적지 않는다.
    var streak: Int {
        guard let s = summary, daysAway < 2 else { return 0 }
        return s.streak
    }

    /// 가장 가까운 일정 한 줄: "D-3 신메뉴 출시" · "오늘 신메뉴 출시" · "진행 중 가을 행사".
    /// 앞으로 시작할 것 중 가장 가까운 것이 먼저다. 없으면 진행 중인 것.
    /// PIN 잠금을 건 앱의 일정은 적지 않는다(잠금 전에 적어 둔 요약에 제목이 남아 있을 수 있다).
    var eventLine: String? {
        guard let s = summary, !s.locked else { return nil }
        let cal = Calendar(identifier: .gregorian)
        let today = cal.startOfDay(for: date)
        var soon: (Int, String, Bool)? = nil
        var ongoing: String? = nil
        for ev in s.events {
            guard let start = dayFormat.date(from: ev.d), let end = dayFormat.date(from: ev.e) else { continue }
            if cal.startOfDay(for: end) < today { continue }        // 이 위젯이 그려지는 날에는 이미 끝났다
            let left = cal.dateComponents([.day], from: today, to: cal.startOfDay(for: start)).day ?? 0
            if left >= 0 {
                if soon == nil || left < soon!.0 { soon = (left, ev.t, ev.d != ev.e) }
            } else if ongoing == nil {
                ongoing = ev.t
            }
        }
        /// 오늘 시작하는 기간 일정은 "진행 중"이다(앱의 일정 탭 · 달력 위젯과 같다).
        if let soon = soon { return (soon.0 == 0 ? (soon.2 ? "진행 중" : "오늘") : "D-\(soon.0)") + " " + soon.1 }
        if let ongoing = ongoing { return "진행 중 " + ongoing }
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
enum Ink {
    static let bg = Color(hex: "#F3E9DC")!
    static let text = Color(hex: "#241F1A")!
    static let muted = Color(hex: "#7A6D62")!
    static let accent = Color(hex: "#A65E2E")!
    static let track = Color(hex: "#E4D6C4")!
    static let line = Color(hex: "#4A423A")!
    static let alert = Color(hex: "#B5453C")!
    static let span = Color(hex: "#4A7FC1")!        // 달력의 기간 일정 막대
}

struct MouseWidgetView: View {
    @Environment(\.widgetFamily) private var family
    let entry: MouseEntry

    var body: some View {
        let look = entry.look
        let rows = entry.summary?.faces[look.face] ?? entry.summary?.faces["normal"] ?? Fallback.rows
        let pal = (entry.summary?.pal.isEmpty ?? true) ? Fallback.pal : entry.summary!.pal
        let medium = family == .systemMedium
        /// 쥐돌이는 도트 한 칸이 정수 배(작은 위젯 2 · 중간 3)가 되는 크기로 둔다.
        let mouse = medium ? CGSize(width: 84, height: 120) : CGSize(width: 56, height: 80)
        GeometryReader { geo in
            /// 쥐돌이 옆에 글이 들어갈 수 있는 폭. 이보다 넓은 글은 줄여서 쥐돌이를 덮지 않게 한다.
            let beside = max(40, geo.size.width - mouse.width - 6)
            ZStack(alignment: .bottomTrailing) {
                VStack(alignment: .leading, spacing: 3) {
                    if medium, let big = look.big {
                        /// 중간 크기는 "오늘 외울 9잔"을 한 줄에. 아래에 챙길 것 두 줄이 더 들어가야 한다.
                        (Text(look.title + " ").font(.system(size: 17, weight: .heavy, design: .rounded))
                         + Text(big).font(.system(size: 26, weight: .heavy, design: .rounded)))
                            .foregroundColor(Ink.text)
                            .lineLimit(1)
                            .minimumScaleFactor(0.6)
                            .frame(maxWidth: beside, alignment: .leading)
                    } else {
                        Text(look.title)
                            .font(.system(size: 17, weight: .heavy, design: .rounded))
                            .foregroundColor(Ink.text)
                            .lineLimit(2)
                            .minimumScaleFactor(0.7)
                            /// 작은 위젯에서 제목 두 줄은 쥐돌이 머리 위에 있어 폭을 다 쓴다. 중간 크기는 쥐돌이 옆이다.
                            .frame(maxWidth: medium ? beside : .infinity, alignment: .leading)
                        if let big = look.big {
                            Text(big)
                                .font(.system(size: 30, weight: .heavy, design: .rounded))
                                .foregroundColor(Ink.text)
                                .lineLimit(1)
                                .minimumScaleFactor(0.5)
                                .frame(maxWidth: beside, alignment: .leading)
                        }
                    }
                    if medium, entry.summary != nil {
                        ProgressBar(value: entry.progress)
                            .frame(width: min(150, beside), height: 10)
                            .padding(.top, 3)
                        Text("외운 잔 \(Int((entry.progress * 100).rounded()))%"
                             + (entry.streak >= 2 ? " · \(entry.streak)일 연속" : " · 치즈 \(entry.summary?.cheese ?? 0)"))
                            .font(.system(size: 12, weight: .semibold, design: .rounded))
                            .foregroundColor(Ink.muted)
                            .lineLimit(1)
                            .frame(maxWidth: beside, alignment: .leading)
                    }
                    Spacer(minLength: 0)
                    if medium {
                        /// 중간 크기에는 오늘 챙길 것 두 줄: 폐기할 재료와 가장 가까운 일정
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
                                .frame(maxWidth: beside, alignment: .leading)
                        }
                    } else if !look.note.isEmpty {
                        Text(look.note)
                            .font(.system(size: 12, weight: .semibold, design: .rounded))
                            .foregroundColor(Ink.muted)
                            .lineLimit(1)
                            .minimumScaleFactor(0.7)
                            .frame(maxWidth: beside, alignment: .leading)
                    }
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
                PixelMouse(rows: rows, pal: pal)
                    .frame(width: mouse.width, height: mouse.height)
            }
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

/// 위젯을 눌렀을 때 앱에 넘기는 주소. 앱(Sources/SceneDelegate.swift)이 받아 그 화면을 연다.
/// 쥐돌이 위젯은 주소를 달지 않는다(그냥 앱이 열린다).
enum WidgetLink {
    static let scheme = "amgijwi-widget"       // SceneDelegate 의 것과 같아야 한다
    static let calendar = URL(string: "\(scheme)://cal")
    static let memo = URL(string: "\(scheme)://memo")
    static func recipe(_ id: String?) -> URL? {
        var c = URLComponents()
        c.scheme = scheme
        c.host = "recipe"
        if let id = id { c.queryItems = [URLQueryItem(name: "id", value: id)] }
        return c.url
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

/// 위젯 묶음. 쥐돌이 위젯 · 달력 위젯은 모든 버전에, 레시피 위젯 · 메모 위젯(고르는 화면이 있다)은 iOS 17 부터 낸다.
@main
struct AmgijwiWidgets: WidgetBundle {
    var body: some Widget {
        AmgijwiWidget()
        CalendarWidget()
        if #available(iOSApplicationExtension 17.0, *) {
            RecipeWidget()
            MemoWidget()
        }
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
