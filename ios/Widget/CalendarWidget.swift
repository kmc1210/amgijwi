import WidgetKit
import SwiftUI

/// 달력 위젯(중간 · 큰 크기). 이번 달 달력에 앱의 일정을 표시하고, 다가오는 일정을 적는다.
///   하루짜리 일정은 날짜 아래 점, 기간 일정은 막대로 이어 그린다. 오늘은 짙은 칸.
///   중간 크기: 왼쪽 달력 + 오른쪽 일정 네 개까지 / 큰 크기: 위 달력 + 아래 일정 다섯 개까지(날짜도 적는다)
/// 일정은 앱이 App Group 에 적어 둔 요약의 cal 에서 읽는다(www/js/widget.js 의 widgetCal). 끝낸 일정은 오지 않는다.
/// 어느 달인지 · 오늘이 며칠인지 · D-day 는 그리는 날짜로 스스로 정한다. 그래서 앱을 열지 않아도 자정마다 바뀐다.
/// 앱에 PIN 잠금을 건 사람의 일정은 앱이 넘기지 않는다. 그때는 달력만 그리고 안내를 적는다.

/// 그리는 날이 든 달. 일요일부터 시작한다(앱의 일정 탭과 같다).
struct MonthGrid {
    let year: Int
    let month: Int
    let today: Int
    let lead: Int       // 1일 앞의 빈칸 수
    let days: Int

    init(date: Date) {
        var cal = Calendar(identifier: .gregorian)
        cal.timeZone = .current
        let c = cal.dateComponents([.year, .month, .day], from: date)
        year = c.year ?? 2000
        month = c.month ?? 1
        today = c.day ?? 1
        let first = cal.date(from: DateComponents(year: year, month: month, day: 1)) ?? date
        lead = cal.component(.weekday, from: first) - 1
        days = cal.range(of: .day, in: .month, for: first)?.count ?? 30
    }

    var weeks: Int { (lead + days + 6) / 7 }

    /// "YYYY-MM-DD". 일정의 날짜와 글자로 견준다.
    func key(_ day: Int) -> String { String(format: "%04d-%02d-%02d", year, month, day) }
}

/// 달력 한 칸 아래에 그릴 표시.
struct DayMark {
    var dot = false         // 하루짜리 일정이 있다
    var bar = false         // 기간 일정에 걸친다
    var capLeft = false     // 막대가 이 날 시작한다(왼쪽을 조금 띄운다)
    var capRight = false    // 막대가 이 날 끝난다
}

/// 다가오는 일정 한 줄.
struct CalRow: Identifiable {
    let id: Int
    let tag: String         // "D-3" · "오늘" · "진행 중"
    let title: String
    let when: String        // "16일 금" · "20~25일"
    let now: Bool           // 진행 중인 기간 일정
}

extension MouseEntry {

    /// 이번 달 날짜마다의 표시.
    func calMarks(_ grid: MonthGrid) -> [Int: DayMark] {
        guard let s = summary else { return [:] }
        let first = grid.key(1), last = grid.key(grid.days)
        var marks: [Int: DayMark] = [:]
        let keys = (1...grid.days).map { grid.key($0) }
        var covered = Set<Int>()        // 막대가 지나는 날
        /// 한 일정이 전날에서 이 날로 이어지는 날(1 은 지난달에서, days+1 은 다음 달로). 이어지지 않는 자리는 띄운다 —
        /// 맞닿은 두 일정이 한 막대로 보이지 않게.
        var joined = Set<Int>()
        for ev in s.cal where ev.e >= first && ev.d <= last && ev.d <= ev.e {
            if ev.d == ev.e {
                if let day = Int(ev.d.suffix(2)) { marks[day, default: DayMark()].dot = true }
                continue
            }
            let from = ev.d < first ? 1 : (keys.firstIndex(of: ev.d) ?? 0) + 1
            let to = ev.e > last ? grid.days : (keys.firstIndex(of: ev.e) ?? grid.days - 1) + 1
            guard from <= to else { continue }
            for day in from...to { covered.insert(day) }
            for day in (ev.d < first ? from : from + 1)...(ev.e > last ? to + 1 : to) where day <= grid.days + 1 { joined.insert(day) }
        }
        for day in covered {
            marks[day, default: DayMark()].bar = true
            marks[day]?.capLeft = !joined.contains(day)
            marks[day]?.capRight = !joined.contains(day + 1)
        }
        return marks
    }

    /// 다가오는 일정. 앞으로 시작할 것을 가까운 순으로 먼저, 이미 진행 중인 것은 그 뒤에
    /// (오래 이어지는 행사가 내일 일정을 가리지 않게 — www/js/widget.js 의 events 와 같은 순서).
    func calRows(_ grid: MonthGrid, limit: Int) -> [CalRow] {
        guard let s = summary, !s.locked else { return [] }
        let cal = Calendar(identifier: .gregorian)
        let today = cal.startOfDay(for: date)
        var soon: [(Int, Summary.Event)] = []
        var ongoing: [Summary.Event] = []
        for ev in s.cal {
            guard let start = dayFormat.date(from: ev.d), let end = dayFormat.date(from: ev.e) else { continue }
            if cal.startOfDay(for: end) < today { continue }
            let left = cal.dateComponents([.day], from: today, to: cal.startOfDay(for: start)).day ?? 0
            if left >= 0 { soon.append((left, ev)) } else { ongoing.append(ev) }
        }
        /// 같은 날 일정은 앱이 넘긴 순서 그대로 둔다(sort 는 순서를 지켜 주지 않는다).
        let ordered = soon.enumerated().sorted { $0.element.0 != $1.element.0 ? $0.element.0 < $1.element.0 : $0.offset < $1.offset }.map { $0.element }
        var rows: [CalRow] = []
        for (left, ev) in ordered {
            let tag = left > 0 ? "D-\(left)" : (ev.d == ev.e ? "오늘" : "진행 중")
            rows.append(CalRow(id: rows.count, tag: tag, title: ev.t, when: calWhen(ev, grid), now: left == 0 && ev.d != ev.e))
        }
        for ev in ongoing {
            rows.append(CalRow(id: rows.count, tag: "진행 중", title: ev.t, when: calWhen(ev, grid), now: true))
        }
        return Array(rows.prefix(limit))
    }

    /// 이번 달 일정은 "16일 금" · "20~25일", 다른 달에 걸치면 "11월 3일" · "10/30~11/2".
    private func calWhen(_ ev: Summary.Event, _ grid: MonthGrid) -> String {
        func parts(_ key: String) -> (Int, Int, Int)? {
            let p = key.split(separator: "-").compactMap { Int($0) }
            return p.count == 3 ? (p[0], p[1], p[2]) : nil
        }
        guard let a = parts(ev.d), let b = parts(ev.e) else { return "" }
        let here = { (p: (Int, Int, Int)) in p.0 == grid.year && p.1 == grid.month }
        if ev.d == ev.e {
            guard here(a) else { return "\(a.1)월 \(a.2)일" }
            let dow = ["일", "월", "화", "수", "목", "금", "토"][(grid.lead + a.2 - 1) % 7]
            return "\(a.2)일 \(dow)"
        }
        if here(a) && here(b) { return "\(a.2)~\(b.2)일" }
        return "\(a.1)/\(a.2)~\(b.1)/\(b.2)"
    }

    /// 일정 자리에 대신 적을 안내. 일정을 보여줄 수 있으면 nil.
    var calNote: String? {
        guard let s = summary, s.hasCal || s.locked else { return "암기쥐를 한 번 열면\n일정이 여기에 보여요." }
        if s.locked { return "PIN 잠금을 쓰는 동안에는\n일정을 내보내지 않아요." }
        return nil
    }
}

/// 요일 줄과 날짜 칸. 주어진 자리를 주 수로 고르게 나눠 쓴다.
struct MonthGridView: View {
    let grid: MonthGrid
    let marks: [Int: DayMark]
    let large: Bool

    private static let dow = ["일", "월", "화", "수", "목", "금", "토"]

    var body: some View {
        GeometryReader { geo in
            let dowH: CGFloat = large ? 16 : 11
            let colW = floor(geo.size.width / 7)
            let rowH = floor(max(0, geo.size.height - dowH) / CGFloat(grid.weeks))
            VStack(alignment: .leading, spacing: 0) {
                HStack(spacing: 0) {
                    ForEach(0..<7, id: \.self) { i in
                        Text(Self.dow[i])
                            .font(.system(size: large ? 11 : 9, weight: .bold, design: .rounded))
                            .foregroundColor(i == 0 ? Ink.alert : Ink.muted)
                            .frame(width: colW, height: dowH, alignment: .top)
                    }
                }
                ForEach(0..<grid.weeks, id: \.self) { week in
                    HStack(spacing: 0) {
                        ForEach(0..<7, id: \.self) { col in
                            cell(week * 7 + col - grid.lead + 1, sunday: col == 0, rowH: rowH)
                                .frame(width: colW, height: rowH)
                        }
                    }
                }
            }
        }
    }

    /// 여섯 주짜리 달의 중간 크기 위젯은 한 줄이 16pt 남짓이다. 숫자 칸을 줄 높이에 맞춰 줄여 표시가 다음 줄로 넘치지 않게 한다.
    @ViewBuilder private func cell(_ day: Int, sunday: Bool, rowH: CGFloat) -> some View {
        if day >= 1 && day <= grid.days {
            let mark = marks[day] ?? DayMark()
            let markH: CGFloat = large ? 5 : 3
            let today = day == grid.today
            VStack(spacing: 1) {
                Text(String(day))
                    .font(.system(size: large ? 13 : 11, weight: .bold, design: .rounded))
                    .foregroundColor(today ? Ink.bg : (sunday ? Ink.alert : Ink.text))
                    .lineLimit(1)
                    .minimumScaleFactor(0.7)
                    .frame(width: large ? 22 : 16)
                    .frame(height: max(6, min(large ? 20 : 14, rowH - markH - 2)))
                    .background(today ? Ink.text : Color.clear)
                ZStack {
                    if mark.bar {
                        Rectangle().fill(Ink.span)
                            .padding(.leading, mark.capLeft ? 3 : 0)
                            .padding(.trailing, mark.capRight ? 3 : 0)
                    }
                    if mark.dot {
                        Rectangle().fill(Ink.accent).frame(width: markH)
                    }
                }
                .frame(height: markH)
                Spacer(minLength: 0)
            }
        } else {
            Color.clear
        }
    }
}

/// 위젯 안쪽. 크기는 밖에서 알려준다(위젯에서는 widgetFamily 로 정한다).
struct CalendarBody: View {
    let entry: MouseEntry
    let large: Bool

    var body: some View {
        let grid = MonthGrid(date: entry.date)
        let marks = entry.calMarks(grid)
        GeometryReader { geo in
            if large {
                /// 일정 다섯 줄 자리를 남기고 나머지를 달력이 쓴다.
                let listH: CGFloat = 5 * 21
                let rowH = min(38, max(20, floor((geo.size.height - 30 - 16 - 13 - listH) / CGFloat(grid.weeks))))
                let rows = entry.summary?.faces["normal"] ?? Fallback.rows
                let pal = (entry.summary?.pal.isEmpty ?? true) ? Fallback.pal : entry.summary!.pal
                VStack(alignment: .leading, spacing: 0) {
                    title(grid, size: 18).frame(height: 30, alignment: .top)
                    MonthGridView(grid: grid, marks: marks, large: true)
                        .frame(height: 16 + rowH * CGFloat(grid.weeks))
                    Rectangle().fill(Ink.track).frame(height: 2).padding(.vertical, 5)
                    ZStack(alignment: .bottomTrailing) {
                        list(grid, limit: 5, size: 13.5, tagW: 48, dated: true)
                            .padding(.trailing, 62)     // 쥐돌이 자리
                            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
                        PixelMouse(rows: rows, pal: pal).frame(width: 56, height: 80)
                    }
                }
            } else {
                let left = min(170, floor(geo.size.width * 0.48))
                HStack(alignment: .top, spacing: 14) {
                    VStack(alignment: .leading, spacing: 0) {
                        title(grid, size: 13).frame(height: 17, alignment: .top)
                        MonthGridView(grid: grid, marks: marks, large: false)
                    }
                    .frame(width: left)
                    VStack(alignment: .leading, spacing: 5) {
                        Text("다가오는 일정")
                            .font(.system(size: 11, weight: .bold, design: .rounded))
                            .foregroundColor(Ink.muted)
                        list(grid, limit: 4, size: 12.5, tagW: 38, dated: false)
                    }
                    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
                }
            }
        }
        .padding(large ? 16 : 14)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    private func title(_ grid: MonthGrid, size: CGFloat) -> some View {
        (Text(String(grid.month) + "월").font(.system(size: size, weight: .heavy, design: .rounded)).foregroundColor(Ink.text)
         + Text(" \(String(grid.year))").font(.system(size: size * 0.7, weight: .bold, design: .rounded)).foregroundColor(Ink.muted))
            .lineLimit(1)
    }

    @ViewBuilder private func list(_ grid: MonthGrid, limit: Int, size: CGFloat, tagW: CGFloat, dated: Bool) -> some View {
        if let note = entry.calNote {
            Text(note).font(.system(size: size - 0.5, weight: .medium, design: .rounded)).foregroundColor(Ink.muted)
        } else {
            let rows = entry.calRows(grid, limit: limit)
            if rows.isEmpty {
                Text("다가오는 일정이 없어요").font(.system(size: size - 0.5, weight: .medium, design: .rounded)).foregroundColor(Ink.muted)
            } else {
                VStack(alignment: .leading, spacing: dated ? 4 : 5) {
                    ForEach(rows) { row in
                        HStack(alignment: .firstTextBaseline, spacing: 4) {
                            Text(row.tag)
                                .font(.system(size: size, weight: .heavy, design: .rounded))
                                .foregroundColor(row.now ? Ink.span : Ink.accent)
                                .lineLimit(1)
                                .minimumScaleFactor(0.7)
                                .frame(width: tagW, alignment: .leading)
                            (Text(row.title).font(.system(size: size, weight: .semibold, design: .rounded)).foregroundColor(Ink.text)
                             + Text(dated && !row.when.isEmpty ? "  " + row.when : "").font(.system(size: size - 2, weight: .semibold, design: .rounded)).foregroundColor(Ink.muted))
                                .lineLimit(1)
                        }
                    }
                }
            }
        }
    }
}

struct CalendarWidgetView: View {
    @Environment(\.widgetFamily) private var family
    let entry: MouseEntry

    var body: some View {
        CalendarBody(entry: entry, large: family == .systemLarge)
            .widgetBackground(Ink.bg)
            .widgetURL(WidgetLink.calendar)
    }
}

struct CalendarWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "AmgijwiCalendar", provider: Provider()) { entry in
            CalendarWidgetView(entry: entry)
        }
        .configurationDisplayName("달력")
        .description("이번 달 달력과 다가오는 일정을 보여줘요. 일정은 앱의 일정 탭에서 넣어요.")
        .supportedFamilies([.systemMedium, .systemLarge])
        .contentMarginsDisabledIfAvailable()
    }
}
