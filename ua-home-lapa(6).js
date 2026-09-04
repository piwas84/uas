/* Lampa.plugin — джерело UA (головна + історія + самооновлення + більше розділів) */
(function () {
    'use strict';

    if (window.__ua_source_plugin_v3) return;
    window.__ua_source_plugin_v3 = true;

    var SOURCE_NAME = 'ua';
    var SOURCE_TITLE = 'UA';

    function wait(cb) {
        if (window.Lampa && Lampa.Api && Lampa.Params && Lampa.Storage) cb();
        else setTimeout(function () { wait(cb); }, 150);
    }

    wait(function () {

        var memCache = {};
        var CACHE_TTL = 30 * 60 * 1000; // 30 хв

        function today() {
            return new Date().toISOString().slice(0, 10);
        }

        function yearAgo() {
            var d = new Date();
            d.setFullYear(d.getFullYear() - 1);
            return d.toISOString().slice(0, 10);
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
                c.source = c.source || SOURCE_NAME;
                if (!c.media_type) {
                    c.media_type = (c.first_air_date || c.name) ? 'tv' : 'movie';
                }
                c.promo = c.overview;
                c.promo_title = c.name || c.title;
                return true;
            });
        }

        function disco(media, sort, extra) {
            var q = 'discover/' + media + '?sort_by=' + (sort || 'popularity.desc') +
                '&language=uk&include_adult=false';
            if (extra) {
                for (var k in extra) {
                    q += '&' + k + '=' + encodeURIComponent(extra[k]);
                }
            }
            return q;
        }

        function fetchTmdb(url, title, call) {
            var cacheKey = url;
            var now = Date.now();
            if (memCache[cacheKey] && (now - memCache[cacheKey].ts) < CACHE_TTL) {
                var cached = memCache[cacheKey].data;
                call({
                    title: title,
                    name: title,
                    results: (cached.results || []).slice(0)
                });
                return;
            }

            if (Lampa.Api && Lampa.Api.list) {
                Lampa.Api.list(
                    { source: 'tmdb', url: url },
                    function (json) {
                        json = json || {};
                        var results = normalize(json.results).slice(0, 20);
                        var data = { title: title, name: title, results: results };
                        memCache[cacheKey] = { ts: Date.now(), data: data };
                        call(data);
                    },
                    function () {
                        directTmdb(url, title, call);
                    }
                );
            } else {
                directTmdb(url, title, call);
            }
        }

        function directTmdb(url, title, call) {
            try {
                var full = url;
                if (full.indexOf('http') !== 0) {
                    var key = (Lampa.TMDB && Lampa.TMDB.key) ? Lampa.TMDB.key() : '';
                    full = 'https://api.themoviedb.org/3/' + url.replace(/^\//, '');
                    full += (full.indexOf('?') >= 0 ? '&' : '?') + 'api_key=' + key + '&language=uk';
                }
                var network = new Lampa.Reguest();
                network.silent(full, function (json) {
                    json = json || {};
                    var results = normalize(json.results).slice(0, 20);
                    var data = { title: title, name: title, results: results };
                    memCache[url] = { ts: Date.now(), data: data };
                    call(data);
                }, function () {
                    call({ title: title, name: title, results: [] });
                });
            } catch (e) {
                call({ title: title, name: title, results: [] });
            }
        }

        function historyRow(type) {
            var results = [];
            try {
                if (Lampa.Favorite && Lampa.Favorite.continues) {
                    results = Lampa.Favorite.continues(type || 'tv') || [];
                }
            } catch (e) {}

            results = (results || []).filter(function (e) {
                return e && (e.poster_path || e.backdrop_path || e.img);
            }).slice(0, 20);

            results.forEach(function (e) {
                if (!e.source) e.source = 'tmdb';
            });

            return {
                title: type === 'movie'
                    ? (Lampa.Lang.translate('title_watched') || 'Історія фільмів')
                    : (Lampa.Lang.translate('title_continue') || 'Продовжити перегляд'),
                name: 'history_' + (type || 'tv'),
                results: results
            };
        }

        // ===== MAIN =====
        function main(params, oncomplite, onerror) {
            params = params || {};

            var parts_data = [
                // Історія
                function (call) { call(historyRow('tv')); },
                function (call) { call(historyRow('movie')); },

                // Тренди
                function (call) {
                    fetchTmdb('trending/all/day?language=uk', 'Сьогодні в тренді', call);
                },
                function (call) {
                    fetchTmdb('trending/movie/week?language=uk', 'Фільми тижня', call);
                },
                function (call) {
                    fetchTmdb('trending/tv/week?language=uk', 'Серіали тижня', call);
                },

                // UAFlix — фільми
                function (call) {
                    fetchTmdb(
                        disco('movie', 'primary_release_date.desc', {
                            'vote_count.gte': '15',
                            'primary_release_date.lte': today()
                        }),
                        'UAFlix · Нові фільми',
                        call
                    );
                },
                function (call) {
                    fetchTmdb(
                        disco('movie', 'popularity.desc', { 'vote_count.gte': '40' }),
                        'UAFlix · Популярні фільми',
                        call
                    );
                },
                function (call) {
                    fetchTmdb(
                        disco('movie', 'vote_average.desc', { 'vote_count.gte': '150' }),
                        'UAFlix · Топ фільмів',
                        call
                    );
                },
                function (call) {
                    fetchTmdb(
                        disco('movie', 'popularity.desc', {
                            with_original_language: 'uk',
                            'vote_count.gte': '5'
                        }),
                        'UAFlix · Українською',
                        call
                    );
                },
                function (call) {
                    fetchTmdb(
                        disco('movie', 'popularity.desc', { with_genres: '16', 'vote_count.gte': '30' }),
                        'UAFlix · Мультфільми',
                        call
                    );
                },
                function (call) {
                    fetchTmdb(
                        disco('movie', 'popularity.desc', { with_genres: '28', 'vote_count.gte': '30' }),
                        'UAFlix · Бойовики',
                        call
                    );
                },
                function (call) {
                    fetchTmdb(
                        disco('movie', 'popularity.desc', { with_genres: '35', 'vote_count.gte': '40' }),
                        'UAFlix · Комедії',
                        call
                    );
                },
                function (call) {
                    fetchTmdb(
                        disco('movie', 'popularity.desc', { with_genres: '99', 'vote_count.gte': '20' }),
                        'UAFlix · Документальні',
                        call
                    );
                },

                // Приховані перлини
                function (call) {
                    fetchTmdb(
                        disco('movie', 'vote_average.desc', {
                            'vote_count.gte': '30',
                            'vote_count.lte': '300',
                            'vote_average.gte': '7.2'
                        }),
                        'Приховані перлини',
                        call
                    );
                },

                // Класика
                function (call) {
                    fetchTmdb(
                        disco('movie', 'vote_average.desc', {
                            'vote_count.gte': '500',
                            'primary_release_date.lte': '2005-01-01'
                        }),
                        'Класика',
                        call
                    );
                },

                // Скоро
                function (call) {
                    fetchTmdb(
                        disco('movie', 'primary_release_date.asc', {
                            'primary_release_date.gte': today(),
                            'vote_count.gte': '5'
                        }),
                        'Скоро на екранах',
                        call
                    );
                },

                // UA Serial
                function (call) {
                    fetchTmdb(
                        disco('tv', 'first_air_date.desc', {
                            'vote_count.gte': '8',
                            'first_air_date.lte': today()
                        }),
                        'UA Serial · Нові серії',
                        call
                    );
                },
                function (call) {
                    fetchTmdb(
                        disco('tv', 'popularity.desc', { 'vote_count.gte': '20' }),
                        'UA Serial · Популярні серіали',
                        call
                    );
                },
                function (call) {
                    fetchTmdb(
                        disco('tv', 'vote_average.desc', { 'vote_count.gte': '80' }),
                        'UA Serial · Топ серіалів',
                        call
                    );
                },
                function (call) {
                    fetchTmdb(
                        disco('tv', 'popularity.desc', {
                            with_original_language: 'uk',
                            'vote_count.gte': '3'
                        }),
                        'UA Serial · Українською',
                        call
                    );
                },
                function (call) {
                    fetchTmdb(
                        disco('tv', 'popularity.desc', {
                            with_original_language: 'ko',
                            'vote_count.gte': '15'
                        }),
                        'UA Serial · Дорами',
                        call
                    );
                },
                function (call) {
                    fetchTmdb(
                        disco('tv', 'popularity.desc', {
                            with_genres: '16',
                            with_original_language: 'ja',
                            'vote_count.gte': '15'
                        }),
                        'UA Serial · Аніме',
                        call
                    );
                }
            ];

            function loadPart(partLoaded, partEmpty) {
                Lampa.Api.partNext(parts_data, 6, partLoaded, partEmpty);
            }

            loadPart(oncomplite, onerror);
            return loadPart;
        }

        // ===== CATEGORY =====
        function category(params, oncomplite, onerror) {
            params = params || {};
            var url = params.url || 'movie';
            var parts_data = [];

            if (url === 'movie') {
                parts_data.push(function (call) { call(historyRow('movie')); });
                parts_data.push(function (call) {
                    fetchTmdb(disco('movie', 'popularity.desc', { 'vote_count.gte': '40' }), 'Популярні', call);
                });
                parts_data.push(function (call) {
                    fetchTmdb(disco('movie', 'primary_release_date.desc', {
                        'vote_count.gte': '15',
                        'primary_release_date.lte': today()
                    }), 'Новинки', call);
                });
                parts_data.push(function (call) {
                    fetchTmdb(disco('movie', 'vote_average.desc', { 'vote_count.gte': '150' }), 'Топ', call);
                });
                parts_data.push(function (call) {
                    fetchTmdb(disco('movie', 'popularity.desc', { with_genres: '16' }), 'Мультфільми', call);
                });
                parts_data.push(function (call) {
                    fetchTmdb(disco('movie', 'popularity.desc', { with_genres: '35' }), 'Комедії', call);
                });
                parts_data.push(function (call) {
                    fetchTmdb(disco('movie', 'popularity.desc', { with_original_language: 'uk' }), 'Українською', call);
                });
            } else {
                parts_data.push(function (call) { call(historyRow('tv')); });
                parts_data.push(function (call) {
                    fetchTmdb(disco('tv', 'popularity.desc', { 'vote_count.gte': '20' }), 'Популярні', call);
                });
                parts_data.push(function (call) {
                    fetchTmdb(disco('tv', 'first_air_date.desc', {
                        'vote_count.gte': '8',
                        'first_air_date.lte': today()
                    }), 'Нові серії', call);
                });
                parts_data.push(function (call) {
                    fetchTmdb(disco('tv', 'vote_average.desc', { 'vote_count.gte': '80' }), 'Топ', call);
                });
                parts_data.push(function (call) {
                    fetchTmdb(disco('tv', 'popularity.desc', { with_original_language: 'ko' }), 'Дорами', call);
                });
                parts_data.push(function (call) {
                    fetchTmdb(disco('tv', 'popularity.desc', {
                        with_genres: '16',
                        with_original_language: 'ja'
                    }), 'Аніме', call);
                });
                parts_data.push(function (call) {
                    fetchTmdb(disco('tv', 'popularity.desc', { with_original_language: 'uk' }), 'Українською', call);
                });
            }

            function loadPart(partLoaded, partEmpty) {
                Lampa.Api.partNext(parts_data, 6, partLoaded, partEmpty);
            }

            loadPart(oncomplite, onerror);
            return loadPart;
        }

        function list(params, oncomplite, onerror) {
            params = params || {};
            var p = Lampa.Arrays.clone(params);
            p.source = 'tmdb';
            if (Lampa.Api.sources.tmdb && Lampa.Api.sources.tmdb.list) {
                return Lampa.Api.sources.tmdb.list(p, function (data) {
                    if (data && data.results) data.results = normalize(data.results);
                    oncomplite(data);
                }, onerror);
            }
            onerror && onerror();
        }

        function full(params, oncomplite, onerror) {
            params = params || {};
            var p = Lampa.Arrays.clone(params);
            p.source = 'tmdb';
            if (Lampa.Api.sources.tmdb && Lampa.Api.sources.tmdb.full) {
                return Lampa.Api.sources.tmdb.full(p, oncomplite, onerror);
            }
            onerror && onerror();
        }

        function search(params, oncomplite) {
            if (Lampa.Api.sources.tmdb && Lampa.Api.sources.tmdb.search) {
                Lampa.Api.sources.tmdb.search(params, function (data) {
                    if (data) {
                        if (data.movie && data.movie.results) data.movie.results = normalize(data.movie.results);
                        if (data.tv && data.tv.results) data.tv.results = normalize(data.tv.results);
                    }
                    oncomplite(data);
                });
            } else {
                oncomplite({});
            }
        }

        function person(params, oncomplite, onerror) {
            var p = Lampa.Arrays.clone(params || {});
            p.source = 'tmdb';
            if (Lampa.Api.sources.tmdb && Lampa.Api.sources.tmdb.person) {
                return Lampa.Api.sources.tmdb.person(p, oncomplite, onerror);
            }
            onerror && onerror();
        }

        function clear() {
            memCache = {};
            if (Lampa.Api.sources.tmdb && Lampa.Api.sources.tmdb.clear) {
                Lampa.Api.sources.tmdb.clear();
            }
        }

        var UA = {
            main: main,
            category: category,
            full: full,
            list: list,
            search: search,
            person: person,
            clear: clear
        };

        function register() {
            try {
                Lampa.Api.sources[SOURCE_NAME] = UA;

                var sources = {};
                try {
                    Lampa.Arrays.extend(sources, Lampa.Params.values['source'] || {});
                } catch (e) {}

                sources.tmdb = sources.tmdb || 'TMDB';
                sources.cub = sources.cub || 'CUB';
                sources[SOURCE_NAME] = SOURCE_TITLE;

                Lampa.Params.select('source', sources, Lampa.Storage.field('source') || 'tmdb');
                console.log('[UA Source] v3+ ready');
            } catch (e) {
                console.log('[UA Source] register error', e);
            }
        }

        register();

        if (Lampa.Listener) {
            Lampa.Listener.follow('app', function (e) {
                if (e && e.type === 'ready') register();
            });

            Lampa.Listener.follow('activity', function (e) {
                if (!e || (e.type !== 'start' && e.type !== 'archive')) return;
                try {
                    var act = Lampa.Activity.active && Lampa.Activity.active();
                    if (!act) return;
                    if (act.component === 'main' && Lampa.Storage.field('source') === SOURCE_NAME) {
                        var last = parseInt(Lampa.Storage.get('ua_source_last_refresh', '0'), 10) || 0;
                        if (Date.now() - last > CACHE_TTL) {
                            memCache = {};
                            Lampa.Storage.set('ua_source_last_refresh', String(Date.now()));
                        }
                    }
                } catch (err) {}
            });
        }

        setInterval(function () {
            memCache = {};
        }, CACHE_TTL);
    });
})();
