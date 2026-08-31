/* Lampa.plugin — UAFlix / UA Serial (ряди на головній як genres_ua) */
(function () {
    'use strict';

    if (window.__ua_home_plugin) return;
    window.__ua_home_plugin = true;

    function wait(cb) {
        if (window.Lampa && Lampa.Api && Lampa.ContentRows) cb();
        else setTimeout(function () { wait(cb); }, 120);
    }

    wait(function () {

        function setting(name, def) {
            var v = Lampa.Storage.get(name, def);
            if (v === 'true') return true;
            if (v === 'false') return false;
            return (v === undefined || v === null) ? def : v;
        }

        function today() {
            return new Date().toISOString().slice(0, 10);
        }

        // ===== РЯДИ UAFlix (фільми) =====
        var UAFLIX_ROWS = [
            { key: 'uah_flix_trend', title: 'UAFlix · Новинки', type: 'all', url: 'trending/all/week', def: true },
            { key: 'uah_flix_top', title: 'UAFlix · Топ IMDb', type: 'movie', url: 'movie/top_rated', def: true },
            { key: 'uah_flix_pop', title: 'UAFlix · Популярні фільми', type: 'movie', url: 'discover/movie?sort_by=popularity.desc', def: true },
            { key: 'uah_flix_now', title: 'UAFlix · Зараз у кіно', type: 'movie', url: 'movie/now_playing', def: true },
            { key: 'uah_flix_anim', title: 'UAFlix · Мультфільми', type: 'movie', url: 'discover/movie?sort_by=popularity.desc&with_genres=16', def: true },
            { key: 'uah_flix_dorama', title: 'UAFlix · Дорами', type: 'tv', url: 'discover/tv?sort_by=popularity.desc&with_original_language=ko|ja|zh|th', def: true }
        ];

        // ===== РЯДИ UA Serial =====
        var UASERIAL_ROWS = [
            { key: 'uah_ser_air', title: 'UA Serial · Нові серії', type: 'tv', url: 'tv/on_the_air', def: true },
            { key: 'uah_ser_pop', title: 'UA Serial · Популярні серіали', type: 'tv', url: 'discover/tv?sort_by=popularity.desc', def: true },
            { key: 'uah_ser_top', title: 'UA Serial · Топ серіалів', type: 'tv', url: 'tv/top_rated', def: true },
            { key: 'uah_ser_trend', title: 'UA Serial · Тренди', type: 'tv', url: 'trending/tv/week', def: true },
            { key: 'uah_ser_dorama', title: 'UA Serial · Дорами', type: 'tv', url: 'discover/tv?sort_by=popularity.desc&with_original_language=ko|ja|zh|th', def: true },
            { key: 'uah_ser_anime', title: 'UA Serial · Аніме', type: 'tv', url: 'discover/tv?sort_by=popularity.desc&with_genres=16&with_original_language=ja', def: true },
            { key: 'uah_ser_cart', title: 'UA Serial · Мультсеріали', type: 'tv', url: 'discover/tv?sort_by=popularity.desc&with_genres=16', def: true }
        ];

        var ALL_ROWS = UAFLIX_ROWS.concat(UASERIAL_ROWS);
        var memCache = {};

        function buildUrl(r) {
            var q = r.url;
            if (q.indexOf('?') >= 0) q += '&language=uk';
            else q += '?language=uk';
            q += '&_d=' + today();
            return q;
        }

        function normalize(results) {
            return (results || []).filter(function (c) {
                if (!c) return false;
                if (!c.poster_path && !c.backdrop_path) return false;
                c.source = 'tmdb';
                if (!c.media_type) {
                    c.media_type = (c.first_air_date || c.name) ? 'tv' : 'movie';
                }
                c.promo_title = c.name || c.title;
                return true;
            });
        }

        function loadRow(title, url, ready) {
            var now = Date.now();
            var entry = memCache[url];
            if (entry && (now - entry.ts) < 6 * 3600 * 1000) {
                ready(entry.data);
                return;
            }

            Lampa.Api.list(
                { source: 'tmdb', url: url },
                function (json) {
                    json = json || {};
                    json.results = normalize(json.results).slice(0, 20);
                    json.title = title;
                    json.name = title;
                    memCache[url] = { ts: Date.now(), data: json };
                    ready(json);
                },
                function () {
                    ready({ title: title, name: title, results: [] });
                }
            );
        }

        // ===== РЯДИ НА ГОЛОВНІЙ (горизонтальний скрол нативно) =====
        ALL_ROWS.forEach(function (r, i) {
            Lampa.ContentRows.add({
                name: r.key,
                title: r.title,
                screen: ['main'],
                index: 30 + i,
                call: function () {
                    if (setting('ua_home_enable', true) === false) return [];
                    if (setting('ua_home_on_main', true) === false) return [];

                    // фільтр по типу
                    var mode = setting('ua_home_mode', 'both');
                    if (mode === 'uaflix' && UAFLIX_ROWS.indexOf(r) < 0) return [];
                    if (mode === 'uaserial' && UASERIAL_ROWS.indexOf(r) < 0) return [];

                    if (setting(r.key, r.def) === false) return [];

                    return function (ready) {
                        loadRow(r.title, buildUrl(r), ready);
                    };
                }
            });
        });

        // ===== НАЛАШТУВАННЯ =====
        if (Lampa.SettingsApi) {
            try {
                Lampa.SettingsApi.addComponent({
                    component: 'ua_home',
                    name: 'UA Home',
                    icon: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>'
                });

                Lampa.SettingsApi.addParam({
                    component: 'ua_home',
                    param: { name: 'ua_home_enable', type: 'trigger', default: true },
                    field: { name: 'Увімкнути плагін', description: 'Ряди UAFlix / UA Serial' }
                });

                Lampa.SettingsApi.addParam({
                    component: 'ua_home',
                    param: { name: 'ua_home_on_main', type: 'trigger', default: true },
                    field: { name: 'Ряди на головній', description: 'Показувати на головній сторінці Lampa' }
                });

                Lampa.SettingsApi.addParam({
                    component: 'ua_home',
                    param: {
                        name: 'ua_home_mode',
                        type: 'select',
                        values: {
                            both: 'UAFlix + UA Serial',
                            uaflix: 'Тільки UAFlix',
                            uaserial: 'Тільки UA Serial'
                        },
                        default: 'both'
                    },
                    field: {
                        name: 'Які ряди показувати',
                        description: 'Фільми, серіали або все'
                    }
                });
            } catch (e) {}
        }

        // ===== МЕНЮ (швидкий перехід) =====
        function addMenu() {
            var list = document.querySelector('.menu .menu__list');
            if (!list) return;

            function makeBtn(title, mode) {
                var li = document.createElement('li');
                li.className = 'menu__item selector';
                li.innerHTML =
                    '<div class="menu__ico"><svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg></div>' +
                    '<div class="menu__text">' + title + '</div>';
                li.addEventListener('hover:enter', function () {
                    Lampa.Storage.set('ua_home_mode', mode);
                    Lampa.Storage.set('ua_home_on_main', true);
                    // повернутись на головну щоб ряди оновились
                    Lampa.Activity.push({
                        url: '',
                        title: Lampa.Lang.translate('title_main') || 'Головна',
                        component: 'main',
                        source: Lampa.Storage.field('source') || 'tmdb',
                        page: 1
                    });
                    Lampa.Noty.show(title + ': ряди на головній');
                });
                // Lampa hover events via jQuery if available
                if (window.$) {
                    $(li).on('hover:enter', function () {
                        Lampa.Storage.set('ua_home_mode', mode);
                        Lampa.Storage.set('ua_home_on_main', true);
                        try {
                            Lampa.Activity.replace({
                                url: '',
                                title: 'Головна',
                                component: 'main',
                                source: Lampa.Storage.field('source') || 'tmdb',
                                page: 1
                            });
                        } catch (e) {
                            Lampa.Activity.push({
                                url: '',
                                title: 'Головна',
                                component: 'main',
                                source: Lampa.Storage.field('source') || 'tmdb',
                                page: 1
                            });
                        }
                        if (Lampa.Noty) Lampa.Noty.show(title + ' увімкнено на головній');
                    });
                }
                list.appendChild(li);
            }

            if (setting('ua_home_enable', true) !== false) {
                makeBtn('UAFlix', 'uaflix');
                makeBtn('UA Serial', 'uaserial');
            }
        }

        if (window.appready) addMenu();
        else {
            Lampa.Listener.follow('app', function (e) {
                if (e.type === 'ready') addMenu();
            });
        }

    });
})();
