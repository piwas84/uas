/* Lampa.plugin — UAFlix / UA Serial (як Жанри UA, ряди на головній) + цікаві розділи + самооновлення */
(function () {
    'use strict';

    if (window.__ua_home_plugin_v2) return;
    window.__ua_home_plugin_v2 = true;

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

        function pluginOn() {
            return setting('ua_home_enable', true) !== false;
        }

        // ===== РЯДИ =====
        var ROWS = [
            // --- Тренди ---
            { key: 'uah_trend', title: 'Зараз у тренді', def: true, type: 'all',
              special: 'trending' },

            // --- UAFlix ---
            { key: 'uah_new', title: 'UAFlix · Новинки', def: true, type: 'movie',
              sort: 'primary_release_date.desc', dynamicDates: true,
              filter: { 'vote_count.gte': '20', include_adult: 'false' } },
            { key: 'uah_pop_m', title: 'UAFlix · Популярні фільми', def: true, type: 'movie',
              sort: 'popularity.desc',
              filter: { include_adult: 'false', 'vote_count.gte': '50' } },
            { key: 'uah_top_m', title: 'UAFlix · Топ фільмів', def: true, type: 'movie',
              sort: 'vote_average.desc',
              filter: { include_adult: 'false', 'vote_count.gte': '200' } },
            { key: 'uah_uk_m', title: 'UAFlix · Українською', def: true, type: 'movie',
              sort: 'popularity.desc',
              filter: { with_original_language: 'uk', include_adult: 'false', 'vote_count.gte': '5' } },
            { key: 'uah_anim', title: 'UAFlix · Мультфільми', def: true, type: 'movie', genre: 16 },
            { key: 'uah_action', title: 'UAFlix · Бойовики', def: true, type: 'movie', genre: 28 },
            { key: 'uah_comedy', title: 'UAFlix · Комедії', def: true, type: 'movie', genre: 35 },
            { key: 'uah_docs', title: 'UAFlix · Документальні', def: false, type: 'movie', genre: 99 },

            // --- Приховані перлини ---
            { key: 'uah_hidden', title: 'Приховані перлини', def: true, type: 'movie',
              sort: 'vote_average.desc',
              filter: {
                  include_adult: 'false',
                  'vote_count.gte': '40',
                  'vote_count.lte': '400',
                  'vote_average.gte': '7.3'
              } },

            // --- Класика ---
            { key: 'uah_classic', title: 'Класика', def: false, type: 'movie',
              sort: 'vote_average.desc',
              filter: {
                  include_adult: 'false',
                  'vote_count.gte': '800',
                  'primary_release_date.lte': '2005-01-01'
              } },

            // --- Скоро ---
            { key: 'uah_soon', title: 'Скоро на екранах', def: true, type: 'movie',
              sort: 'primary_release_date.asc',
              filter: {
                  include_adult: 'false',
                  'primary_release_date.gte': today(),
                  'vote_count.gte': '5'
              } },

            // --- UA Serial ---
            { key: 'uah_ser_new', title: 'UA Serial · Нові серії', def: true, type: 'tv',
              sort: 'first_air_date.desc', dynamicDates: true,
              filter: { 'vote_count.gte': '10', include_adult: 'false' } },
            { key: 'uah_ser_pop', title: 'UA Serial · Популярні серіали', def: true, type: 'tv',
              sort: 'popularity.desc',
              filter: { include_adult: 'false', 'vote_count.gte': '30' } },
            { key: 'uah_ser_top', title: 'UA Serial · Топ серіалів', def: true, type: 'tv',
              sort: 'vote_average.desc',
              filter: { include_adult: 'false', 'vote_count.gte': '100' } },
            { key: 'uah_uk_s', title: 'UA Serial · Українською', def: true, type: 'tv',
              sort: 'popularity.desc',
              filter: { with_original_language: 'uk', include_adult: 'false', 'vote_count.gte': '3' } },
            { key: 'uah_dorama', title: 'UA Serial · Дорами', def: true, type: 'tv',
              sort: 'popularity.desc',
              filter: { with_original_language: 'ko|ja|zh|th', include_adult: 'false', 'vote_count.gte': '20' } },
            { key: 'uah_anime', title: 'UA Serial · Аніме', def: true, type: 'tv', genre: 16,
              filter: { with_original_language: 'ja', include_adult: 'false' } },
            { key: 'uah_cart', title: 'UA Serial · Мультсеріали', def: true, type: 'tv', genre: 16 }
        ];

        var memCache = {};
        var lastDay = today();
        var CACHE_TTL = 4 * 3600 * 1000; // 4 години

        function clearMemCache() {
            memCache = {};
            lastDay = today();
            Lampa.Storage.set('ua_home_last_clear', String(Date.now()));
        }

        function ensureFreshDay() {
            if (today() !== lastDay) {
                clearMemCache();
            }
        }

        function buildUrl(r) {
            ensureFreshDay();

            // Спеціальний рядок — тренди
            if (r.special === 'trending') {
                return 'trending/all/day?language=uk&_d=' + today();
            }

            var media = r.type === 'tv' ? 'tv' : 'movie';
            var q = 'discover/' + media + '?sort_by=' + (r.sort || 'popularity.desc');

            if (r.filter) {
                for (var k in r.filter) {
                    q += '&' + k + '=' + encodeURIComponent(r.filter[k]);
                }
            } else if (r.genre) {
                q += '&with_genres=' + r.genre +
                     '&include_adult=false&vote_count.gte=40';
            }

            if (r.dynamicDates || r.genre) {
                if (media === 'movie') q += '&primary_release_date.lte=' + today();
                else q += '&first_air_date.lte=' + today();
            }

            q += '&language=uk';
            q += '&_d=' + today();
            return q;
        }

        function normalize(results) {
            var list = results || [];
            var seen = {};
            return list.filter(function (c) {
                if (!c) return false;
                if (!c.poster_path && !c.backdrop_path && !c.img) return false;
                var key = (c.id || '') + '_' + (c.media_type || c.name || c.title || '');
                if (seen[key]) return false;
                seen[key] = true;
                c.promo = c.overview;
                c.promo_title = c.name || c.title;
                if (!c.media_type) {
                    c.media_type = (c.first_air_date || c.name) ? 'tv' : 'movie';
                }
                c.source = 'tmdb';
                return true;
            });
        }

        function loadRow(title, url, ready) {
            ensureFreshDay();

            var now = Date.now();
            var entry = memCache[url];
            if (entry && (now - entry.ts) < CACHE_TTL) {
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

        // ===== РЯДИ НА ГОЛОВНІЙ =====
        ROWS.forEach(function (r, i) {
            Lampa.ContentRows.add({
                name: r.key,
                title: r.title,
                screen: ['main'],
                index: 30 + i,
                call: function () {
                    if (!pluginOn()) return [];
                    if (setting('ua_home_on_main', true) === false) return [];
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
                    icon: '<svg viewBox="0 0 100 100"><rect x="12" y="12" width="76" height="76" rx="22" fill="none" stroke="currentColor" stroke-width="6"/><text x="50" y="62" text-anchor="middle" font-size="28" font-weight="700" fill="currentColor">UA</text></svg>'
                });

                Lampa.SettingsApi.addParam({
                    component: 'ua_home',
                    param: { name: 'ua_home_enable', type: 'trigger', default: true },
                    field: { name: 'Увімкнути плагін', description: 'Ряди UAFlix / UA Serial на головній' }
                });

                Lampa.SettingsApi.addParam({
                    component: 'ua_home',
                    param: { name: 'ua_home_on_main', type: 'trigger', default: true },
                    field: { name: 'Ряди на головній', description: 'Показувати рядки на головній сторінці' }
                });

                ROWS.forEach(function (r) {
                    Lampa.SettingsApi.addParam({
                        component: 'ua_home',
                        param: { name: r.key, type: 'trigger', default: r.def },
                        field: { name: r.title, description: 'Показувати цей ряд' }
                    });
                });
            } catch (e) {
                console.log('[UA Home] settings error', e);
            }
        }

        // ===== МЕНЮ =====
        var menuAdded = false;

        function openMenu() {
            if (!pluginOn()) return;
            var items = ROWS.filter(function (r) {
                return setting(r.key, r.def) !== false;
            }).map(function (r) {
                return { title: r.title, row: r };
            });

            if (Lampa.Select && Lampa.Select.show) {
                Lampa.Select.show({
                    title: 'UA Home',
                    items: items,
                    onSelect: function (a) {
                        if (!a || !a.row) return;
                        var r = a.row;

                        if (r.special === 'trending') {
                            Lampa.Activity.push({
                                url: 'trending/all/day',
                                title: r.title,
                                component: 'category_full',
                                source: 'tmdb',
                                page: 1
                            });
                            return;
                        }

                        var media = r.type === 'tv' ? 'tv' : 'movie';
                        var filter = {};
                        if (r.filter) {
                            for (var k in r.filter) filter[k] = r.filter[k];
                        } else if (r.genre) {
                            filter.with_genres = String(r.genre);
                            filter.include_adult = 'false';
                            filter['vote_count.gte'] = '40';
                        }
                        Lampa.Activity.push({
                            url: 'discover/' + media,
                            title: r.title,
                            component: 'category_full',
                            source: 'tmdb',
                            page: 1,
                            sort_by: r.sort || 'popularity.desc',
                            card_type: true,
                            filter: filter
                        });
                    },
                    onBack: function () {
                        Lampa.Controller.toggle('menu');
                    }
                });
            }
        }

        function addMenu() {
            if (menuAdded) return;
            if (!pluginOn()) return;
            try {
                var icon = '<svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>';
                if (Lampa.Menu && Lampa.Menu.addButton) {
                    Lampa.Menu.addButton(icon, 'UA Home', openMenu);
                    menuAdded = true;
                }
            } catch (e) {
                console.log('[UA Home] menu error', e);
            }
        }

        // ===== САМООНОВЛЕННЯ =====
        if (Lampa.Listener) {
            Lampa.Listener.follow('menu', function (e) {
                if (e.type === 'start' || e.type === 'end') setTimeout(addMenu, 80);
            });

            Lampa.Listener.follow('app', function (e) {
                if (e && e.type === 'ready') {
                    ensureFreshDay();
                    setTimeout(addMenu, 500);
                }
            });

            // При поверненні на головну — перевіряємо, чи не застарів кеш
            Lampa.Listener.follow('activity', function (e) {
                if (!e || (e.type !== 'start' && e.type !== 'archive')) return;
                try {
                    var act = Lampa.Activity.active && Lampa.Activity.active();
                    if (act && act.component === 'main') {
                        ensureFreshDay();
                        var lastClear = parseInt(Lampa.Storage.get('ua_home_last_clear', '0'), 10) || 0;
                        if (Date.now() - lastClear > CACHE_TTL) {
                            clearMemCache();
                        }
                    }
                } catch (err) {}
            });
        }

        // Періодичне очищення (якщо Lampa довго відкрита)
        setInterval(function () {
            ensureFreshDay();
        }, 30 * 60 * 1000); // кожні 30 хв

        setTimeout(addMenu, 1500);
        setTimeout(addMenu, 3500);

        console.log('[UA Home] v2+ — з трендами, перлинами та самооновленням');
    });
})();
