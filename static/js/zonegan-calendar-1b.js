/* ============================================================
   ZONEGAN RACING — puente de calendario "afiche de grilla" (1b)
   ------------------------------------------------------------
   No inicializa nada: FullCalendar lo sigue montando el bundle.js
   del panel con el feed /events.ics. Este script solamente:

     1. espera a que FullCalendar termine de renderizar dentro de
        #calendar (sirva v3, v4, v5 o v6, y sin importar el orden
        de carga de los <script>);
     2. copia el título del mes de la barra nativa al encabezado
        grande (#zg-cal-month / #zg-cal-year), traducido al español;
     3. engancha los botones propios (#zg-cal-prev / #zg-cal-next /
        #zg-cal-today) a la navegación real del calendario, así los
        meses se piden al mismo feed que ya usa el panel;
     4. traduce los nombres de día y marca cada evento con una clase
        (zg-ev-champ / zg-ev-practice / zg-ev-loop) para la leyenda.

   Si algo no aparece (otra versión de FullCalendar, otro markup),
   cada paso falla en silencio y queda la grilla nativa funcionando.
   ============================================================ */
(function () {
    "use strict";

    var MONTHS = {
        january: "Enero", february: "Febrero", march: "Marzo", april: "Abril",
        may: "Mayo", june: "Junio", july: "Julio", august: "Agosto",
        september: "Septiembre", october: "Octubre", november: "Noviembre",
        december: "Diciembre",
        enero: "Enero", febrero: "Febrero", marzo: "Marzo", abril: "Abril",
        mayo: "Mayo", junio: "Junio", julio: "Julio", agosto: "Agosto",
        septiembre: "Septiembre", octubre: "Octubre", noviembre: "Noviembre",
        diciembre: "Diciembre"
    };

    var DAYS = {
        mon: "Lun", monday: "Lun", lun: "Lun",
        tue: "Mar", tues: "Mar", tuesday: "Mar", mar: "Mar",
        wed: "Mié", wednesday: "Mié", "mié": "Mié", mie: "Mié",
        thu: "Jue", thur: "Jue", thurs: "Jue", thursday: "Jue", jue: "Jue",
        fri: "Vie", friday: "Vie", vie: "Vie",
        sat: "Sáb", saturday: "Sáb", "sáb": "Sáb", sab: "Sáb",
        sun: "Dom", sunday: "Dom", dom: "Dom"
    };

    var root = document.getElementById("calendar");
    if (!root) {
        return;
    }

    var monthEl = document.getElementById("zg-cal-month");
    var yearEl = document.getElementById("zg-cal-year");

    function q(sel) {
        return root.querySelector(sel);
    }

    /* --- título nativo: v5/v6 usa .fc-toolbar-title, v3/v4 un <h2> --- */
    function nativeTitle() {
        var el = q(".fc-toolbar-title") || q(".fc-toolbar h2") || q(".fc-center h2");
        return el ? el.textContent.trim() : "";
    }

    function paintTitle() {
        var raw = nativeTitle();
        if (!raw || !monthEl) {
            return;
        }
        var year = (raw.match(/\d{4}/) || [""])[0];
        var word = raw.replace(/[\d.,]/g, "").replace(/\s*de\s*$/i, "").trim().split(/\s+/)[0] || "";
        var month = MONTHS[word.toLowerCase()] || word || raw;

        if (monthEl.textContent !== month) {
            monthEl.textContent = month;
        }
        if (yearEl && yearEl.textContent !== year) {
            yearEl.textContent = year;
        }
    }

    /* --- navegación: primero los botones nativos, después la API --- */
    function api() {
        // v5/v6 expone la instancia si el bundle la dejó global
        var c = window.calendar || window.fullCalendar || window.zgCalendar;
        if (c && typeof c.prev === "function") {
            return c;
        }
        return null;
    }

    function move(which) {
        var btn = q(".fc-" + which + "-button");
        if (btn) {
            btn.click();
            return;
        }
        var c = api();
        if (c) {
            c[which]();
            return;
        }
        // v3 vive sobre jQuery
        if (window.jQuery && window.jQuery.fn && window.jQuery.fn.fullCalendar) {
            window.jQuery("#calendar").fullCalendar(which);
        }
    }

    function wire(id, which) {
        var el = document.getElementById(id);
        if (!el) {
            return;
        }
        el.addEventListener("click", function (e) {
            e.preventDefault();
            move(which);
            window.setTimeout(decorate, 60);
        });
    }

    wire("zg-cal-prev", "prev");
    wire("zg-cal-next", "next");
    wire("zg-cal-today", "today");

    /* --- nombres de día --- */
    function paintDayNames() {
        var cells = root.querySelectorAll(".fc-col-header-cell-cushion, .fc-day-header > span, .fc-day-header > a, th.fc-day-header");
        for (var i = 0; i < cells.length; i++) {
            var el = cells[i];
            var txt = (el.textContent || "").trim();
            if (!txt) {
                continue;
            }
            var key = txt.toLowerCase().replace(/[.,]/g, "").split(/\s+/)[0];
            var es = DAYS[key];
            if (es && txt !== es) {
                el.textContent = es;
            }
        }
    }

    /* --- clasificación de eventos para la leyenda --- */
    var PRACTICE = /pr[aá]ctic|practice|qualif|clasific/i;
    var LOOP = /bucle|loop|repet/i;
    /* el backend inyecta un evento sintético "no-events" (ID fijo, 3 h de
       duración desde "ahora") cuando no hay carreras programadas; en las
       vistas de semana/lista se veía como aviso, pero en la grilla de mes
       aparece como un chip de evento roto pisando el día de hoy. Se oculta. */
    var NO_EVENTS = /no scheduled events/i;

    function paintEvents() {
        var events = root.querySelectorAll(".fc-event, .fc-daygrid-event, a.fc-day-grid-event");
        for (var i = 0; i < events.length; i++) {
            var ev = events[i];
            var txt = ev.textContent || "";
            if (NO_EVENTS.test(txt)) {
                var holder = ev.closest(".fc-daygrid-event-harness") || ev.closest(".fc-daygrid-day-events") || ev;
                /* FullCalendar v3/v4 recalcula su propio layout de eventos y
                   pisa cualquier style.display inline que le pongamos, así
                   que se oculta con una clase + CSS !important en su lugar. */
                holder.classList.add("zg-ev-hidden");
                continue;
            }
            ev.classList.remove("zg-ev-champ", "zg-ev-practice", "zg-ev-loop");
            if (LOOP.test(txt)) {
                ev.classList.add("zg-ev-loop");
            } else if (PRACTICE.test(txt)) {
                ev.classList.add("zg-ev-practice");
            } else {
                ev.classList.add("zg-ev-champ");
            }
        }
    }

    var pending = false;
    function decorate() {
        if (pending) {
            return;
        }
        pending = true;
        window.requestAnimationFrame(function () {
            pending = false;
            try {
                paintTitle();
                paintDayNames();
                paintEvents();
            } catch (err) {
                /* nunca romper la grilla nativa */
            }
        });
    }

    /* --- esperar a que FullCalendar exista, y re-decorar en cada render --- */
    function ready() {
        return !!(q(".fc-view-harness") || q(".fc-view") || q(".fc-view-container") || q("table.fc-scrollgrid"));
    }

    var observer = new MutationObserver(function () {
        root.classList.add("zg-cal-ready");
        decorate();
    });
    observer.observe(root, { childList: true, subtree: true, characterData: true });

    var tries = 0;
    var poll = window.setInterval(function () {
        tries++;
        if (ready()) {
            root.classList.add("zg-cal-ready");
            decorate();
        }
        if (tries > 120) {           // ~30 s y listo
            window.clearInterval(poll);
        }
    }, 250);

    if (document.readyState === "complete") {
        decorate();
    } else {
        window.addEventListener("load", decorate);
    }
})();
