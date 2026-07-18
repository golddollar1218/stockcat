/* ============================================================
   STOCKCAT — interactions, canvas charts, effects
   ============================================================ */

(function () {
  "use strict";

  var prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  /* ----------------------------------------------------------
     Nav: scrolled state + mobile burger
  ---------------------------------------------------------- */
  var nav = document.getElementById("nav");
  var burger = document.getElementById("nav-burger");
  var navLinks = document.getElementById("nav-links");

  window.addEventListener(
    "scroll",
    function () {
      nav.classList.toggle("scrolled", window.scrollY > 30);
    },
    { passive: true }
  );

  burger.addEventListener("click", function () {
    navLinks.classList.toggle("open");
  });

  navLinks.addEventListener("click", function (e) {
    if (e.target.tagName === "A") navLinks.classList.remove("open");
  });

  /* ----------------------------------------------------------
     Ticker tape
  ---------------------------------------------------------- */
  var tickerData = [
    ["STOCKCAT", "+420.69%", true],
    ["MEOW/USD", "+69.42%", true],
    ["PURR", "+128.80%", true],
    ["TUNA", "-3.21%", false],
    ["WHISKER", "+55.10%", true],
    ["NAPTIME", "+9.99%", true],
    ["LASERPTR", "-1.05%", false],
    ["CATNIP", "+312.07%", true],
    ["SCRATCH", "+24.63%", true],
    ["HAIRBALL", "-0.42%", false],
  ];

  var track = document.getElementById("ticker-track");
  var tickerHTML = "";
  // duplicated so the -50% translate loops seamlessly
  for (var r = 0; r < 2; r++) {
    tickerData.forEach(function (t) {
      tickerHTML +=
        "<span>" +
        t[0] +
        ' <b class="' +
        (t[2] ? "up" : "down") +
        '">' +
        t[1] +
        "</b></span>";
    });
  }
  track.innerHTML = tickerHTML;

  /* ----------------------------------------------------------
     Scroll reveal
  ---------------------------------------------------------- */
  var revealEls = document.querySelectorAll(".reveal");
  var io = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
          io.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15 }
  );
  revealEls.forEach(function (el) {
    io.observe(el);
  });

  /* ----------------------------------------------------------
     Animated stat counters
  ---------------------------------------------------------- */
  var statEls = document.querySelectorAll(".stat-num");
  var statIO = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        statIO.unobserve(entry.target);
        var el = entry.target;
        var target = parseInt(el.getAttribute("data-count"), 10);
        var suffix = el.getAttribute("data-suffix") || "";
        var start = performance.now();
        var dur = 1400;
        function tick(now) {
          var p = Math.min((now - start) / dur, 1);
          var eased = 1 - Math.pow(1 - p, 3);
          el.textContent = Math.round(target * eased) + suffix;
          if (p < 1) requestAnimationFrame(tick);
        }
        requestAnimationFrame(tick);
      });
    },
    { threshold: 0.6 }
  );
  statEls.forEach(function (el) {
    statIO.observe(el);
  });

  /* ----------------------------------------------------------
     Cursor glow follows the mouse
  ---------------------------------------------------------- */
  var glow = document.getElementById("cursor-glow");
  if (!prefersReducedMotion && matchMedia("(pointer: fine)").matches) {
    window.addEventListener(
      "mousemove",
      function (e) {
        glow.style.left = e.clientX + "px";
        glow.style.top = e.clientY + "px";
      },
      { passive: true }
    );
  } else {
    glow.style.display = "none";
  }

  /* ----------------------------------------------------------
     Hero terminal: 3D tilt on hover
  ---------------------------------------------------------- */
  var terminal = document.getElementById("cat-terminal");
  if (
    terminal &&
    !prefersReducedMotion &&
    matchMedia("(pointer: fine)").matches
  ) {
    terminal.addEventListener("mousemove", function (e) {
      var rect = terminal.getBoundingClientRect();
      var x = (e.clientX - rect.left) / rect.width - 0.5;
      var y = (e.clientY - rect.top) / rect.height - 0.5;
      terminal.style.transform =
        "perspective(900px) rotateY(" +
        x * 7 +
        "deg) rotateX(" +
        -y * 7 +
        "deg)";
    });
    terminal.addEventListener("mouseleave", function () {
      terminal.style.transform = "perspective(900px) rotateY(0) rotateX(0)";
    });
  }

  /* ----------------------------------------------------------
     Hero chart: live-drawing candlestick chart
  ---------------------------------------------------------- */
  (function heroChart() {
    var canvas = document.getElementById("hero-chart");
    if (!canvas) return;
    var ctx = canvas.getContext("2d");
    var W = canvas.width,
      H = canvas.height;
    var priceEl = document.getElementById("term-price");

    var candles = [];
    var maxCandles = 34;
    var price = 0.0042;

    function nextCandle() {
      var open = price;
      // upward drift — this is STOCKCAT after all
      var drift = (Math.random() - 0.38) * 0.0006;
      var close = Math.max(0.0005, open + drift);
      var high = Math.max(open, close) + Math.random() * 0.0003;
      var low = Math.min(open, close) - Math.random() * 0.0003;
      price = close;
      return { o: open, c: close, h: high, l: low };
    }

    for (var i = 0; i < maxCandles; i++) candles.push(nextCandle());

    function draw() {
      ctx.clearRect(0, 0, W, H);

      var all = [];
      candles.forEach(function (c) {
        all.push(c.h, c.l);
      });
      var min = Math.min.apply(null, all);
      var max = Math.max.apply(null, all);
      var pad = (max - min) * 0.15 || 0.0001;
      min -= pad;
      max += pad;

      function y(v) {
        return H - ((v - min) / (max - min)) * H;
      }

      // horizontal grid lines
      ctx.strokeStyle = "rgba(255,255,255,0.05)";
      ctx.lineWidth = 1;
      for (var g = 1; g < 5; g++) {
        ctx.beginPath();
        ctx.moveTo(0, (H / 5) * g);
        ctx.lineTo(W, (H / 5) * g);
        ctx.stroke();
      }

      var slot = W / maxCandles;
      var bw = Math.max(3, slot * 0.55);

      candles.forEach(function (c, idx) {
        var x = idx * slot + slot / 2;
        var up = c.c >= c.o;
        var color = up ? "#00c805" : "#ff5000";

        ctx.strokeStyle = color;
        ctx.beginPath();
        ctx.moveTo(x, y(c.h));
        ctx.lineTo(x, y(c.l));
        ctx.stroke();

        ctx.fillStyle = color;
        if (up) {
          ctx.shadowColor = "rgba(0,200,5,0.55)";
          ctx.shadowBlur = 8;
        }
        var top = y(Math.max(c.o, c.c));
        var hgt = Math.max(2, Math.abs(y(c.o) - y(c.c)));
        ctx.fillRect(x - bw / 2, top, bw, hgt);
        ctx.shadowBlur = 0;
      });

      if (priceEl) priceEl.textContent = "$" + price.toFixed(4);
    }

    draw();
    if (!prefersReducedMotion) {
      setInterval(function () {
        candles.push(nextCandle());
        if (candles.length > maxCandles) candles.shift();
        draw();
      }, 900);
    }
  })();

  /* ----------------------------------------------------------
     Background: slow ambient candlestick field
  ---------------------------------------------------------- */
  (function bgChart() {
    var canvas = document.getElementById("candle-bg");
    var ctx = canvas.getContext("2d");
    var candles = [];
    var slot = 26;
    var count = 0;

    function resize() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      count = Math.ceil(canvas.width / slot) + 2;
      candles = [];
      var base = canvas.height * 0.62;
      for (var i = 0; i < count; i++) {
        base += (Math.random() - 0.47) * 26;
        base = Math.min(
          canvas.height * 0.9,
          Math.max(canvas.height * 0.3, base)
        );
        candles.push(makeCandle(base));
      }
    }

    function makeCandle(base) {
      var up = Math.random() > 0.42;
      return {
        base: base,
        body: 14 + Math.random() * 46,
        wick: 8 + Math.random() * 22,
        up: up,
        alpha: 0.05 + Math.random() * 0.1,
      };
    }

    var offset = 0;
    var speed = prefersReducedMotion ? 0 : 0.25;

    function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (var i = 0; i < candles.length; i++) {
        var c = candles[i];
        var x = i * slot - offset;
        var color = c.up ? "0,200,5" : "255,80,0";

        ctx.strokeStyle = "rgba(" + color + "," + c.alpha * 0.9 + ")";
        ctx.beginPath();
        ctx.moveTo(x, c.base - c.body - c.wick);
        ctx.lineTo(x, c.base + c.wick);
        ctx.stroke();

        ctx.fillStyle = "rgba(" + color + "," + c.alpha + ")";
        ctx.fillRect(x - 6, c.base - c.body, 12, c.body);
      }

      offset += speed;
      if (offset >= slot) {
        offset = 0;
        candles.shift();
        var last = candles[candles.length - 1];
        var base = last.base + (Math.random() - 0.47) * 26;
        base = Math.min(
          canvas.height * 0.9,
          Math.max(canvas.height * 0.3, base)
        );
        candles.push(makeCandle(base));
      }
      if (speed > 0) requestAnimationFrame(draw);
    }

    resize();
    window.addEventListener("resize", resize);
    draw();
  })();

  /* ----------------------------------------------------------
     Contract address copy
  ---------------------------------------------------------- */
  var copyBtn = document.getElementById("copy-ca");
  var caEl = document.getElementById("contract-address");
  copyBtn.addEventListener("click", function () {
    var text = caEl.textContent.trim();
    navigator.clipboard.writeText(text).then(function () {
      var original = copyBtn.textContent;
      copyBtn.textContent = "COPIED";
      setTimeout(function () {
        copyBtn.textContent = original;
      }, 1600);
    });
  });

  /* ----------------------------------------------------------
     Dexscreener links: single place to update once pair is live.
     Set PAIR_URL to e.g. "https://dexscreener.com/robinhood/0xcomingsoonethereum/0x..."
  ---------------------------------------------------------- */
  var PAIR_URL = ""; // leave empty until the pair is live

  if (PAIR_URL) {
    ["hero-chart-link", "chart-outlink", "social-dex", "footer-dex"].forEach(
      function (id) {
        var el = document.getElementById(id);
        if (el) el.href = PAIR_URL;
      }
    );
    var embed = document.getElementById("dexscreener-embed");
    if (embed) embed.src = PAIR_URL + "?embed=1&theme=dark&trades=0&info=0";
  }
})();
