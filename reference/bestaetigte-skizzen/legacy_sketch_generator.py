import math, os
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import Circle, Polygon, Rectangle, FancyBboxPatch
from matplotlib import gridspec

D = 21.4            # Zeichnungsbasis 21700 (mm)
R = D / 2
H = D * math.sqrt(3) / 2
L = 70.0
GAPZ = 4.0          # Fischpapier zwischen Pack A und B (Draufsicht)

C_PLUS = "#d7263d"; C_MINUS = "#1d4ed8"; C_BR = "#f28c28"
C_NI = ["#8a95a1", "#c4cbd2"]; C_CELL = "#f6f1e6"; C_EDGE = "#2b2b2b"; C_TXT = "#222"

CELLS = {"21700": (21.4, 70.0), "18650": (18.5, 65.0)}


def other(f):
    return "H" if f == "V" else "V"


def make_pack(name, n, p, direction, m0, s_start):
    W = (n + 0.5) * D
    if p == 2:
        order = [[("B", k), ("T", k)] for k in range(1, n + 1)]
    else:
        order = []
        for k in range(1, n + 1):
            # gleiche Zelllagerung in allen Packs: obere Lage immer nach LINKS versetzt.
            # Läuft der Strang links->rechts, ist die äußerste Zelle links die obere.
            order += ([[("B", k)], [("T", k)]] if direction == "RL" else [[("T", k)], [("B", k)]])
    groups, s = [], s_start
    for j, g in enumerate(order):
        s += 1
        minus = m0 if j % 2 == 0 else other(m0)
        cells = []
        for layer, k in g:
            if direction == "RL":
                x = W - R - (k - 1) * D - (D / 2 if layer == "T" else 0)
            else:
                x = k * D - (D / 2 if layer == "T" else 0)
            y = R + (H if layer == "T" else 0)
            cells.append(dict(x=x, y=y, layer=layer))
        groups.append(dict(s=s, cells=cells, minus=minus, plus=other(minus)))
    return dict(name=name, n=n, p=p, W=W, dir=direction, groups=groups)


def strips(pack, first_kind, last_kind):
    gs = pack["groups"]
    out = [dict(face=gs[0]["minus"], cells=gs[0]["cells"], tap=gs[0]["s"] - 1, kind=first_kind)]
    for a, b in zip(gs, gs[1:]):
        assert a["plus"] == b["minus"]
        out.append(dict(face=a["plus"], cells=a["cells"] + b["cells"], tap=a["s"], kind="series"))
    out.append(dict(face=gs[-1]["plus"], cells=gs[-1]["cells"], tap=gs[-1]["s"], kind=last_kind))
    return out


def hull(pts):
    pts = sorted(set(pts))
    if len(pts) < 3:
        return pts
    def cross(o, a, b):
        return (a[0]-o[0])*(b[1]-o[1]) - (a[1]-o[1])*(b[0]-o[0])
    lo, up = [], []
    for p in pts:
        while len(lo) >= 2 and cross(lo[-2], lo[-1], p) <= 0: lo.pop()
        lo.append(p)
    for p in reversed(pts):
        while len(up) >= 2 and cross(up[-2], up[-1], p) <= 0: up.pop()
        up.append(p)
    return lo[:-1] + up[:-1]


def draw_strip(ax, pts, color):
    for (x, y) in pts:
        ax.add_patch(Circle((x, y), 0.40 * D, fc=color, ec="none", zorder=2))
    for i in range(len(pts)):
        for j in range(i + 1, len(pts)):
            (x1, y1), (x2, y2) = pts[i], pts[j]
            l = math.hypot(x2 - x1, y2 - y1)
            if l < 1.05 * D:
                nx, ny = -(y2 - y1) / l, (x2 - x1) / l
                w = 0.30 * D
                ax.add_patch(Polygon([(x1+nx*w, y1+ny*w), (x2+nx*w, y2+ny*w),
                                      (x2-nx*w, y2-ny*w), (x1-nx*w, y1-ny*w)],
                                     fc=color, ec="none", zorder=2))
    hp = hull(pts)
    if len(hp) >= 3:
        ax.add_patch(Polygon(hp, fc=color, ec="none", zorder=2))


KIND_STYLE = {
    "main-": (C_MINUS, "HAUPT −"),
    "main+": (C_PLUS, "HAUPT +"),
    "bridge-out": (C_BR, "BRÜCKE"),
    "bridge-in": (C_BR, "BRÜCKE"),
    "boost-in": (C_PLUS, "EINGANG von Pack B +"),
    "boost-out": (C_PLUS, "SYSTEM +"),
}


def draw_face(ax, pack, strip_list, face, title, bridge_note=None):
    W = pack["W"]
    X = (lambda x: W - x) if face == "V" else (lambda x: x)
    # Zellen
    for g in pack["groups"]:
        for c in g["cells"]:
            ax.add_patch(Circle((X(c["x"]), c["y"]), R * 0.97, fc=C_CELL, ec="none", zorder=1))
    # Nickel
    fs = [s for s in strip_list if s["face"] == face]
    for i, s in enumerate(sorted(fs, key=lambda s: s["tap"])):
        col = C_NI[i % 2]
        draw_strip(ax, [(X(c["x"]), c["y"]) for c in s["cells"]], col)
    # Konturen + Beschriftung
    for g in pack["groups"]:
        for c in g["cells"]:
            cx, cy = X(c["x"]), c["y"]
            ax.add_patch(Circle((cx, cy), R * 0.97, fc="none", ec=C_EDGE, lw=0.9, zorder=3))
            neg = g["minus"] == face
            ax.text(cx, cy + 2.2, "−" if neg else "+", ha="center", va="center", fontsize=12,
                    fontweight="bold", color=C_MINUS if neg else C_PLUS, zorder=4)
            ax.text(cx, cy - 5.6, str(g["s"]), ha="center", va="center", fontsize=6.5,
                    color="#555", zorder=4)
    top = R + H + R
    # Abgriffe
    ti = 0
    for s in fs:
        mx = sum(X(c["x"]) for c in s["cells"]) / len(s["cells"])
        if s["kind"] == "series":
            ax.text(mx, top + 4.5, f"B{s['tap']}", ha="center", va="bottom", fontsize=7,
                    color=C_TXT, zorder=4)
        else:
            col, lab = KIND_STYLE[s["kind"]]
            low = min(c["y"] for c in s["cells"])
            extra = f" (B{s['tap']})"
            if s["kind"].startswith("bridge") and bridge_note:
                lab = lab + " " + bridge_note
            box = dict(boxstyle="round,pad=0.25", fc="white", ec=col, lw=0.8)
            if low > R + 1:   # nur obere Lage -> Fahne nach oben
                ax.plot([mx, mx], [low + R - 2, top + 16], color=col, lw=4, solid_capstyle="round", zorder=5)
                ax.text(mx, top + 18, lab + extra, ha="center", va="bottom", fontsize=7.5,
                        fontweight="bold", color=col, zorder=6, bbox=box)
            else:
                yl = -9 - 10 * ti; ti += 1
                ax.plot([mx, mx], [low - R + 2, yl + 2], color=col, lw=4, solid_capstyle="round", zorder=5)
                ax.text(mx, yl - 2, lab + extra, ha="center", va="top", fontsize=7.5,
                        fontweight="bold", color=col, zorder=6, bbox=box)
                ax.text(mx, top + 4.5, f"B{s['tap']}", ha="center", va="bottom", fontsize=7,
                        color=col, fontweight="bold", zorder=4)
    # Seitenmarker
    left_img, right_img = ("R", "L") if face == "V" else ("L", "R")
    ax.text(-6, R + H / 2, left_img, ha="right", va="center", fontsize=15, fontweight="bold", color="#888")
    ax.text(W + 6, R + H / 2, right_img, ha="left", va="center", fontsize=15, fontweight="bold", color="#888")
    ax.text(-1, -1, "unten", fontsize=5.5, color="#999", ha="right", va="top")
    ax.set_title(title, fontsize=9.5, fontweight="bold", loc="left")
    ax.set_xlim(-22, W + 22)
    ax.set_ylim(-36, top + 30)
    ax.set_aspect("equal")
    ax.axis("off")


def draw_top(ax, packs, bridge_side_even, split=None):
    A, B = packs[0], packs[1]
    W = A["W"]
    def pack_rect(y0, pk, label, arrow_dir):
        ax.add_patch(Rectangle((0, y0 - L), pk["W"], L, fc="#fbf8f1", ec=C_EDGE, lw=1.2, zorder=1))
        # untere Lage als Zellstreifen
        for g in pk["groups"]:
            for c in g["cells"]:
                if c["layer"] == "B":
                    ax.add_patch(Rectangle((c["x"] - R, y0 - L), D, L, fc="none", ec="#cfc6b3", lw=0.6, zorder=1))
        ax.text(pk["W"] / 2, y0 - L * 0.28, label, ha="center", va="center", fontsize=9, fontweight="bold")
        xs, xe = (pk["W"] - D, D) if arrow_dir == "RL" else (D, pk["W"] - D)
        ax.annotate("", xy=(xe, y0 - L * 0.6), xytext=(xs, y0 - L * 0.6),
                    arrowprops=dict(arrowstyle="-|>", color="#666", lw=1.5), zorder=3)
        ax.text(pk["W"] / 2, y0 - L * 0.78, "Serienrichtung", ha="center", fontsize=6.5, color="#666")
    yA, yB = 0, -(L + GAPZ)
    pack_rect(yA, A, A["name"], "RL")
    pack_rect(yB, B, B["name"], "LR")
    xr = W - 0.75 * D
    xl = 0.75 * D
    # Hauptminus / plus
    ax.plot([xr, xr], [yA, yA + 12], color=C_MINUS, lw=4, solid_capstyle="round")
    ax.text(xr, yA + 14, "HAUPT −", color=C_MINUS, ha="center", va="bottom", fontsize=8, fontweight="bold")
    yEnd = yB - L
    if split is None:
        ax.plot([xr, xr], [yEnd, yEnd - 12], color=C_PLUS, lw=4, solid_capstyle="round")
        ax.text(xr, yEnd - 14, "HAUPT +", color=C_PLUS, ha="center", va="top", fontsize=8, fontweight="bold")
    # Brücke
    if not bridge_side_even:
        ax.plot([xl, xl], [yA - L, yB], color=C_BR, lw=5, solid_capstyle="butt", zorder=4)
        ax.annotate("BRÜCKE\n(Mitte, links)", xy=(xl, yA - L - GAPZ / 2), xytext=(-6, yA - L - 2),
                    fontsize=7.5, color=C_BR, fontweight="bold", ha="right", va="center",
                    arrowprops=dict(arrowstyle="-", color=C_BR))
    else:
        path = [(xl, yA), (xl, yA + 8), (-12, yA + 8), (-12, yEnd - 8), (xl, yEnd - 8), (xl, yEnd)]
        ax.plot(*zip(*path), color=C_BR, lw=3.5, zorder=4)
        ax.text(-15, (yA + yEnd) / 2, "BRÜCKE (Kabel links außen)", rotation=90, color=C_BR,
                fontsize=7.5, fontweight="bold", ha="right", va="center")
    ax.text(W / 2, 30, "VORNE", ha="center", fontsize=11, fontweight="bold", color="#888")
    ymin = yEnd - 30
    if split is not None:
        bk = split
        bx0 = W - bk["W"]
        by0 = yEnd - 38
        ax.add_patch(Rectangle((bx0, by0 - L), bk["W"], L, fc="#fff3e6", ec=C_EDGE, lw=1.2, ls="--"))
        ax.text(bx0 - 4, by0 - L / 2, "2S2P Booster\n(separates Gehäuse,\nz. B. Controller-Seite)",
                ha="right", va="center", fontsize=7.5)
        # Kabel Hauptpack + -> Booster -
        bin_x = bx0 + 0.75 * D
        ax.plot([xr, xr, bin_x, bin_x], [yEnd, yEnd - 16, yEnd - 16, by0], color=C_PLUS, lw=3)
        ax.text(xr + 3, yEnd - 8, "B18 → Booster −", color=C_PLUS, fontsize=7, fontweight="bold", va="center")
        bout_x = bx0 + 1.75 * D
        ax.plot([bout_x, bout_x], [by0, by0 + 8], color=C_PLUS, lw=4)
        ax.text(bout_x + 3, by0 + 4, "SYSTEM + (B20)", color=C_PLUS, fontsize=7.5, fontweight="bold", va="center")
        ymin = by0 - L - 12
    else:
        ax.text(W / 2, yEnd - 30, "HINTEN", ha="center", fontsize=11, fontweight="bold", color="#888")
    ax.text(-4, 22, "LINKS", ha="left", fontsize=7, color="#888")
    ax.text(W + 4, 22, "RECHTS", ha="right", fontsize=7, color="#888")
    ax.set_title("Draufsicht (vorne oben)", fontsize=9.5, fontweight="bold", loc="left")
    ax.set_xlim(-75, W + 20)
    ax.set_ylim(ymin - 8, 42)
    ax.set_aspect("equal")
    ax.axis("off")


def dims(n):
    out = []
    for cell, (d, l) in CELLS.items():
        out.append(f"  {cell}: {(n + 0.5) * d:.0f} × {(1 + math.sqrt(3) / 2) * d:.0f} × {l:.0f} mm")
    return out


def figure(key, title, n, p, split=False, fname=None):
    S_pack = n * (2 if p == 1 else 1)
    A = make_pack("Pack A (vorne)", n, p, "RL", "V", 0)
    G = len(A["groups"])
    mB = "V" if G % 2 == 1 else "H"
    B = make_pack("Pack B (hinten)", n, p, "LR", mB, A["groups"][-1]["s"])
    assert B["groups"][-1]["plus"] == "H"
    sA = strips(A, "main-", "bridge-out")
    sB = strips(B, "bridge-in", "boost-in" if False else ("main+" if not split else "main+"))
    boost = None
    if split:
        boost = make_pack("Booster 2S2P", 2, 2, "LR", "V", B["groups"][-1]["s"])
        sBo = strips(boost, "boost-in", "boost-out")
        # Hauptpack-Plus wird zum Übergang zum Booster
        sB[-1]["kind"] = "main+"
    S = (boost or B)["groups"][-1]["s"]
    cells_total = 2 * n * 2 + (4 if split else 0)
    even = G % 2 == 0

    fig = plt.figure(figsize=(17, 10.5), dpi=130)
    gsp = gridspec.GridSpec(3, 3, width_ratios=[1.05, 1.5, 1.5], height_ratios=[1, 1, 0.78],
                            hspace=0.28, wspace=0.08, left=0.02, right=0.99, top=0.9, bottom=0.02)
    fig.suptitle(title, fontsize=17, fontweight="bold", x=0.02, ha="left", y=0.975)
    fig.text(0.02, 0.935, "Skizze / Entwurf – Zellen liegend, 2 Lagen versetzt (Wabe). "
             "Minus vorne rechts, Plus hinten rechts. Ansichten jeweils von AUSSEN auf die Stirnseite.",
             fontsize=10, color="#444")
    axT = fig.add_subplot(gsp[0:2, 0])
    draw_top(axT, [A, B], even, split=boost)
    bA = "→ Pack B"; bB = "← Pack A"
    draw_face(fig.add_subplot(gsp[0, 1]), A, sA, "V", "Pack A – vordere Stirnseite (Blick von vorne)", bA)
    draw_face(fig.add_subplot(gsp[0, 2]), A, sA, "H", "Pack A – hintere Stirnseite (Blick von hinten)", bA)
    draw_face(fig.add_subplot(gsp[1, 1]), B, sB, "V", "Pack B – vordere Stirnseite (Blick von vorne)", bB)
    draw_face(fig.add_subplot(gsp[1, 2]), B, sB, "H", "Pack B – hintere Stirnseite (Blick von hinten)", bB)

    # Info
    axI = fig.add_subplot(gsp[2, 0]); axI.axis("off")
    per = "je Pack" if not split else "je Hauptpack"
    lines = [
        f"{key}:  {cells_total} Zellen,  {S}S  →  {S * 3.6:.1f} V nominal / {S * 4.2:.1f} V voll",
        f"2 Packs à {n * 2} Zellen ({n} je Lage, {G}S{p}P {per})" + ("  +  2S2P Booster" if split else ""),
        "",
        "Maße je Pack (B × H × L, blanke Zellen, ca.):",
        *dims(n),
    ]
    if split:
        lines += ["Booster 2S2P:", *dims(2)]
    axI.text(0, 1, "\n".join(lines), va="top", ha="left", fontsize=9, family="DejaVu Sans")
    # Legende
    lx, ly = 0.0, 0.08
    axI.text(lx, ly, "Legende:  ", fontsize=8.5, fontweight="bold", va="center", transform=axI.transAxes)
    items = [("−", C_MINUS, "Minuspol sichtbar"), ("+", C_PLUS, "Pluspol sichtbar")]
    xx = 0.22
    for sym, col, t in items:
        axI.text(xx, ly, sym, color=col, fontsize=13, fontweight="bold", va="center", transform=axI.transAxes)
        axI.text(xx + 0.05, ly, t, fontsize=8, va="center", transform=axI.transAxes)
        xx += 0.4
    axI.text(0.0, ly - 0.12, "Grau = Nickelstreifen · Zahl in Zelle = Seriengruppe · Bx = Balancer-Abgriff (B0 = Hauptminus)",
             fontsize=7.5, va="center", transform=axI.transAxes, color="#444")

    if split:
        sBo_list = sBo
        draw_face(fig.add_subplot(gsp[2, 1]), boost, sBo_list, "V", "Booster 2S2P – Stirnseite 1", None)
        draw_face(fig.add_subplot(gsp[2, 2]), boost, sBo_list, "H", "Booster 2S2P – Stirnseite 2", None)
    else:
        axN = fig.add_subplot(gsp[2, 1:]); axN.axis("off")
        pg = ("P-Gruppe = Zelle unten + schräg darüber liegende Zelle oben (gleiche Zahl, parallel)."
              if p == 2 else "1P: jede Zelle ist eine eigene Seriengruppe (Zickzack unten → oben → unten …).")
        notes = [
            "Aufbau / Annahmen (bitte prüfen):",
            "•  Zellen liegen in Längsrichtung, obere Lage um ½ Zelle versetzt (Wabe).",
            f"•  Pack A liegt vorne, Pack B direkt dahinter; Serienfolge A: rechts → links, B: links → rechts (U-Schleife).",
            "•  Beide Packs identisch gestapelt (obere Lage nach links versetzt) → Schrägen laufen in A und B gleich.",
            "•  Pack A startet unten rechts (erste Verbindung schräg nach oben); Pack B startet links an der äußersten Zelle.",
            f"•  {pg}",
            ("•  Brücke sitzt in der Mitte links zwischen A-hinten und B-vorne."
             if not even else
             "•  Gerade Gruppenzahl → Brücke liegt zwischen A-vorne-links und B-hinten-links (Kabel außen)."),
            "•  Zwischen A und B Fischpapier/Isolierplatte; innere Stirnseiten vor dem Zusammenfügen schweißen.",
        ]
        axN.text(0.02, 1, "\n".join(notes), va="top", ha="left", fontsize=9)
    fig.savefig(fname, dpi=130)
    plt.close(fig)
    return fname


if __name__ == "__main__":
    os.makedirs("/tmp/work/out", exist_ok=True)
    figure("18S2P", "18S2P – 2 Packs à 9S2P (18 Zellen je Pack, 9 je Lage)", 9, 2, fname="/tmp/work/out/Skizze_18S2P.png")
    figure("32S1P", "32S1P – 2 Packs à 16S1P (16 Zellen je Pack, 8 je Lage)", 8, 1, fname="/tmp/work/out/Skizze_32S1P.png")
    figure("20S2P", "20S2P – 2 Packs à 10S2P (20 Zellen je Pack, 10 je Lage)", 10, 2, fname="/tmp/work/out/Skizze_20S2P.png")
    figure("20S2P Splitpack", "20S2P Splitpack – 18S2P (2 × 9S2P) + 2S2P Booster", 9, 2, split=True,
           fname="/tmp/work/out/Skizze_20S2P_Splitpack.png")
    print("ok")
