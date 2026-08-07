/*
 * ヘッダーの弧の外側をぐるぐる回る問いかけを組み立てる。
 *
 * 文字を1文字ずつ絶対配置し、円の中心から見た角度を1文字ぶんずつずらしていくので、
 * 文章そのものが弧に沿って曲がる。
 * 角度の周期・アニメーション時間は実測値から計算するため、
 * フォントサイズや半径をCSSで変えても手で数字を合わせ直す必要はない。
 */
(() => {
    "use strict";

    /* 外周の行。文言はここを書き換えるだけでよい */
    const OUTER = [
        "アントレプレナーシップって？",
        "アントレ部ってなにする部活？",
        "高専生でも会社をつくれる？",
        "つくったもので稼げるの？",
        "技術で世の中を変えたい",
        "就職か進学だけじゃないの？",
        "やりたいことを見つけたい",
        "仲間と何かを始めてみたい"
    ];

    /* 内周の行 */
    const INNER = [
        "起業って儲かるの？",
        "アイデアってどうやって出すの？",
        "ブレーンストーミングってなに？",
        "ビジネスコンテストに出てみたい",
        "長岡から世界に挑戦したい",
        "好きなことを仕事にしたい！",
        "高専からでも挑戦できる？",
        "部活だけどガチでやってる"
    ];

    /* 弧の内側のタイトル。曲げる部分だけ。続きの「ってなに？」はHTML側 */
    const TITLE = "アントレプレナークラブ";

    /* フレーズとフレーズの間隔（文字数） */
    const GAP = 3;
    /* 文字が流れる速さ（px/秒） */
    const SPEED = 30;

    const DEG = 180 / Math.PI;

    const header = document.querySelector("header");
    const ring = document.querySelector(".hero-ring");
    const titleArc = document.querySelector(".hero-title-arc");
    if (!header || !ring) return;

    /* --q-r などはCSSのcalc式のままなので、実際の長さは要素を置いて測る */
    const probe = document.createElement("div");
    probe.className = "hero-probe";
    probe.setAttribute("aria-hidden", "true");
    probe.innerHTML =
        '<i class="hero-probe-r"></i>' +
        '<i class="hero-probe-row"></i>' +
        '<i class="hero-probe-text">あああああああああああああああああああ</i>' +
        '<i class="hero-probe-tr"></i>' +
        '<i class="hero-probe-t-rise"></i>' +
        '<i class="hero-probe-arc-r"></i>' +
        '<i class="hero-probe-arc-rise"></i>' +
        '<i class="hero-probe-inset"></i>' +
        '<i class="hero-probe-t-max"></i>' +
        '<i class="hero-probe-title">あああああああああああああああああああ</i>';
    header.appendChild(probe);

    const probeR = probe.querySelector(".hero-probe-r");
    const probeRow = probe.querySelector(".hero-probe-row");
    const probeText = probe.querySelector(".hero-probe-text");
    const probeTitleR = probe.querySelector(".hero-probe-tr");
    const probeTitleRise = probe.querySelector(".hero-probe-t-rise");
    const probeArcR = probe.querySelector(".hero-probe-arc-r");
    const probeArcRise = probe.querySelector(".hero-probe-arc-rise");
    const probeInset = probe.querySelector(".hero-probe-inset");
    const probeTitleMax = probe.querySelector(".hero-probe-t-max");
    const probeTitle = probe.querySelector(".hero-probe-title");
    const PROBE_CHARS = probeText.textContent.length;

    const px = (el) => el.getBoundingClientRect().width;

    /* 1行ぶんの文字を、角度を振りながらDOMに吐く */
    const layout = (parent, phrases, radius, charDeg, period, outer) => {
        const gaps = phrases.length;
        /* 周期に足りないぶんはフレーズ間の空きに均等に配る */
        const slack = Math.max(0, (period - angleOf(phrases, charDeg)) / gaps);

        let cursor = 0;
        for (const phrase of phrases) {
            for (const char of phrase) {
                const el = document.createElement("span");
                el.className = outer ? "hero-q hero-q--out" : "hero-q";
                /* 文字の中心に角度を合わせる */
                el.style.setProperty("--a", (cursor + charDeg / 2).toFixed(4) + "deg");
                el.textContent = char;
                parent.appendChild(el);
                cursor += charDeg;
            }
            cursor += GAP * charDeg + slack;
        }
    };

    /* 文字が全部、弧の内側に収まるか。
       タイトルの円は弧の円とは別なので、文字の四隅を弧の中心から測って判定する */
    const fitsInArc = (geo, scale) => {
        const height = geo.font * scale;
        const advance = geo.advance * scale;
        const charRad = advance / geo.radius;
        /* タイトルの円の中心が、弧の中心より何px下にあるか */
        const offset = (geo.radius - geo.rise) - (geo.arcR - geo.arcRise);
        const limit = geo.arcR - geo.inset;

        for (let i = 0; i < geo.count; i += 1) {
            const th = (i - (geo.count - 1) / 2) * charRad;
            const sin = Math.sin(th);
            const cos = Math.cos(th);
            /* 文字の下端が headerの下端より下に行ってしまわないか */
            if (geo.rise - geo.radius * (1 - cos) < 0) return false;
            for (const r of [geo.radius, geo.radius + height]) {
                for (const t of [-advance / 2, advance / 2]) {
                    const x = r * sin + t * cos;
                    const y = -r * cos + t * sin + offset;
                    /* 弧の内側か、かつ画面幅に収まっているか */
                    if (Math.hypot(x, y) > limit) return false;
                    if (Math.abs(x) > geo.side) return false;
                }
            }
        }
        return true;
    };

    /* タイトルを中央そろえで弧に沿わせる */
    const buildTitle = () => {
        if (!titleArc) return;
        /* 前回詰めたサイズが残っていると測り直せないので戻す */
        header.style.removeProperty("--t-font");

        const geo = {
            radius: px(probeTitleR),
            rise: px(probeTitleRise),
            arcR: px(probeArcR),
            arcRise: px(probeArcRise),
            inset: px(probeInset),
            /* 中心から端までの許容幅。画面の余白と最大幅(--t-max)の厳しいほう */
            side: Math.min(header.clientWidth / 2 - px(probeInset) * 2, px(probeTitleMax) / 2),
            font: parseFloat(getComputedStyle(probeTitle).fontSize),
            advance: px(probeTitle) / PROBE_CHARS,
            count: [...TITLE].length
        };
        if (!geo.radius || !geo.advance || !geo.arcR) return;

        /* 収まる最大の倍率を二分探索する */
        let scale = 1;
        if (!fitsInArc(geo, 1)) {
            let lo = 0;
            let hi = 1;
            for (let i = 0; i < 30; i += 1) {
                const mid = (lo + hi) / 2;
                if (fitsInArc(geo, mid)) lo = mid; else hi = mid;
            }
            scale = lo;
            header.style.setProperty("--t-font", (geo.font * scale).toFixed(2) + "px");
        }

        const charDeg = (geo.advance * scale / geo.radius) * DEG;
        const chars = [...TITLE];
        const next = document.createDocumentFragment();
        chars.forEach((char, i) => {
            const el = document.createElement("span");
            el.className = "hero-title-char";
            /* 文字列全体の中心が真上（0度）に来るように振り分ける */
            el.style.setProperty("--a", ((i - (chars.length - 1) / 2) * charDeg).toFixed(4) + "deg");
            el.textContent = char;
            next.appendChild(el);
        });
        titleArc.replaceChildren(next);
    };

    /* 弧の半径を決める。
       頂点の高さ(--arc-rise)を保ったまま、headerの下端の左右の角にちょうど届く円にする。
       半径を固定にすると、横長の画面ほど弧が角に届かず途切れて見える。
       真円のままなので、同じ中心に乗せた問いかけの円もズレない */
    const fitArc = () => {
        header.style.removeProperty("--arc-r");
        const rise = px(probeArcRise);
        const half = header.clientWidth / 2;
        if (!rise || !half) return;
        /* 弦の半分が half、矢が rise の円の半径 */
        header.style.setProperty("--arc-r", ((half * half + rise * rise) / (2 * rise)).toFixed(2) + "px");
    };

    /* 円周に入りきるぶんだけフレーズを採る。
       画面が狭いと弧が小さくなり、全部は一周に収まらないので先頭から間引く */
    const fitPhrases = (phrases, charDeg, limit) => {
        const kept = [];
        let used = 0;
        for (const phrase of phrases) {
            const need = (phrase.length + GAP) * charDeg;
            if (used + need > limit) break;
            kept.push(phrase);
            used += need;
        }
        return kept.length ? kept : phrases.slice(0, 1);
    };

    const angleOf = (phrases, charDeg) =>
        (phrases.reduce((n, p) => n + p.length, 0) + GAP * phrases.length) * charDeg;

    const build = () => {
        const radiusIn = probeR.getBoundingClientRect().width;
        const radiusOut = radiusIn + probeRow.getBoundingClientRect().width;
        /* letter-spacing 込みの実際の文字送り */
        const advance = probeText.getBoundingClientRect().width / PROBE_CHARS;
        if (!radiusIn || !advance) return;

        /* 半径が違うと同じ文字送りでも角度が変わるので、行ごとに1文字あたりの角度を出す */
        const charIn = (advance / radiusIn) * DEG;
        const charOut = (advance / radiusOut) * DEG;
        /* 長いほうに文字が収まる長さ。短いほうは空きを広げて埋める */
        let listIn = INNER;
        let listOut = OUTER;
        let natural = Math.max(angleOf(listIn, charIn), angleOf(listOut, charOut));
        /* 一周にも収まらないなら、収まるところまで文言を減らす */
        if (natural > 360) {
            listIn = fitPhrases(INNER, charIn, 360);
            listOut = fitPhrases(OUTER, charOut, 360);
            natural = Math.max(angleOf(listIn, charIn), angleOf(listOut, charOut));
        }

        /* 円周をちょうど何等分するか。
           周期を 360/blocks にして円周を隙間なく敷き詰めると、
           ブロックが1周を超えて先頭に重なることがなく、--q-step 回すだけでループが閉じる。
           文字が多くて2つ入らない（natural > 180deg）ときは1周＝1ブロックになり、
           重なる代わりにフレーズ間が広がる */
        const blocks = Math.max(1, Math.floor(360 / natural));
        const period = 360 / blocks;

        const next = document.createDocumentFragment();
        for (let k = 0; k < blocks; k += 1) {
            const block = document.createElement("div");
            block.className = "hero-ring-block";
            block.style.setProperty("--k", k);
            layout(block, listOut, radiusOut, charOut, period, true);
            layout(block, listIn, radiusIn, charIn, period, false);
            next.appendChild(block);
        }

        ring.replaceChildren(next);
        header.style.setProperty("--q-step", period.toFixed(3) + "deg");
        /* 周期が変わっても文字の流れる速さが一定になるようにする */
        header.style.setProperty("--q-duration", (period / DEG * radiusIn / SPEED).toFixed(2) + "s");
    };

    const buildAll = () => {
        /* 問いかけもタイトルも弧の半径から決まるので、これを先に確定させる */
        fitArc();
        build();
        buildTitle();
    };

    buildAll();
    /* Webフォントが後から効くと文字送りが変わるので測り直す */
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(buildAll);

    let timer = 0;
    let width = window.innerWidth;
    window.addEventListener("resize", () => {
        if (window.innerWidth === width) return;
        width = window.innerWidth;
        clearTimeout(timer);
        timer = setTimeout(buildAll, 200);
    });
})();
