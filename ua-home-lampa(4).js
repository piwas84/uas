/* Lampa.plugin — джерело UA (як TMDB / CUB / KP) */
(function () {
    'use strict';

    if (window.__ua_source_plugin) return;
    window.__ua_source_plugin = true;

    var SOURCE_NAME = 'ua';
    var SOURCE_TITLE = 'UA';

    function wait(cb) {
        if (window.Lampa && Lampa.Api && Lampa.Params) cb();
        else setTimeout(function () { wait(cb); }, 120);
    }

    wait(function () {

        function today() {
            return new Date().toISOString().slice(0, 10);
        }

        function normalize(results) {
            var list = results || [];
            var seen = {};
            return list.filter(function (c) {
                if (!c) return false;
                var key = (c.id || '') + '_' + (c.media_type || c.name || c.title || '');
                if (seen[key]) return false;
                seen[key] = true;
                c.source = SOURCE_NAME;
                if (!c.media_type) {
                    c.media_type = (c.first_air_date || c.name) ? 'tv' : 'movie';
                }
                c.promo = c.overview;
                c.promo_title = c.name || c.title;
                return true;
            });
        }

        function tmdbList(url, title, call) {
            Lampa.Api.list(
                { source: 'tmdb', url: url },
                function (json) {
                    json = json || {};
                    json.results = normalize(json.results).slice(0, 20);
                    json.title = title;
                    json.name = title;
                    call(json);
                },
                function () {
                    call({ title: title, name: title, results: [] });
                }
            );
        }

        function disco(media, sort, extra) {
            var q = 'discover/' + media + '?sort_by=' + (sort || 'popularity.desc') +
                '&language=uk&include_adult=false&_d=' + today();
            if (extra) {
                for (var k in extra) {
                    q += '&' + k + '=' + encodeURIComponent(extra[k]);
                }
            }
            return q;
        }

        // ===== MAIN (головна сторінка джерела UA) =====
        function main(params, oncomplite, onerror) {
            params = params || {};

            var parts_data = [
                function (call) {
                    tmdbList(
                        disco('movie', 'primary_release_date.desc', { 'vote_count.gte': '20', 'primary_release_date.lte': today() }),
                        'UAFlix · Нові фільми',
                        call
                    );
                },
                function (call) {
                    tmdbList(
                        disco('movie', 'popularity.desc', { 'vote_count.gte': '50' }),
                        'UAFlix · Популярні фільми',
                        call
                    );
                },
                function (call) {
                    tmdbList(
                        disco('movie', 'vote_average.desc', { 'vote_count.gte': '200' }),
                        'UAFlix · Топ фільмів',
                        call
                    );
                },
                function (call) {
                    tmdbList(
                        disco('movie', 'popularity.desc', { with_genres: '16', 'vote_count.gte': '40' }),
                        'UAFlix · Мультфільми',
                        call
                    );
                },
                function (call) {
                    tmdbList(
                        disco('movie', 'popularity.desc', { with_genres: '28', 'vote_count.gte': '40' }),
                        'UAFlix · Бойовики',
                        call
                    );
                },
                function (call) {
                    tmdbList(
                        disco('tv', 'first_air_date.desc', { 'vote_count.gte': '10', 'first_air_date.lte': today() }),
                        'UA Serial · Нові серії',
                        call
                    );
                },
                function (call) {
                    tmdbList(
                        disco('tv', 'popularity.desc', { 'vote_count.gte': '30' }),
                        'UA Serial · Популярні серіали',
                        call
                    );
                },
                function (call) {
                    tmdbList(
                        disco('tv', 'vote_average.desc', { 'vote_count.gte': '100' }),
                        'UA Serial · Топ серіалів',
                        call
                    );
                },
                function (call) {
                    tmdbList(
                        disco('tv', 'popularity.desc', {
                            with_original_language: 'ko|ja|zh|th',
                            'vote_count.gte': '20'
                        }),
                        'UA Serial · Дорами',
                        call
                    );
                },
                function (call) {
                    tmdbList(
                        disco('tv', 'popularity.desc', {
                            with_genres: '16',
                            with_original_language: 'ja',
                            'vote_count.gte': '20'
                        }),
                        'UA Serial · Аніме',
                        call
                    );
                },
                function (call) {
                    tmdbList(
                        disco('tv', 'popularity.desc', { with_genres: '16', 'vote_count.gte': '20' }),
                        'UA Serial · Мультсеріали',
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

        // ===== CATEGORY (Фільми / Серіали в меню) =====
        function category(params, oncomplite, onerror) {
            params = params || {};
            var parts_data = [];
            var url = params.url || 'movie';

            if (url === 'movie') {
                parts_data = [
                    function (call) {
                        tmdbList(disco('movie', 'popularity.desc', { 'vote_count.gte': '50' }), 'Популярні', call);
                    },
                    function (call) {
                        tmdbList(disco('movie', 'primary_release_date.desc', { 'vote_count.gte': '20', 'primary_release_date.lte': today() }), 'Новинки', call);
                    },
                    function (call) {
                        tmdbList(disco('movie', 'vote_average.desc', { 'vote_count.gte': '200' }), 'Топ', call);
                    },
                    function (call) {
                        tmdbList(disco('movie', 'popularity.desc', { with_genres: '16' }), 'Мультфільми', call);
                    },
                    function (call) {
                        tmdbList(disco('movie', 'popularity.desc', { with_genres: '28' }), 'Бойовики', call);
                    },
                    function (call) {
                        tmdbList(disco('movie', 'popularity.desc', { with_genres: '35' }), 'Комедії', call);
                    }
                ];
            } else if (url === 'tv') {
                parts_data = [
                    function (call) {
                        tmdbList(disco('tv', 'popularity.desc', { 'vote_count.gte': '30' }), 'Популярні', call);
                    },
                    function (call) {
                        tmdbList(disco('tv', 'first_air_date.desc', { 'vote_count.gte': '10', 'first_air_date.lte': today() }), 'Нові серії', call);
                    },
                    function (call) {
                        tmdbList(disco('tv', 'vote_average.desc', { 'vote_count.gte': '100' }), 'Топ', call);
                    },
                    function (call) {
                        tmdbList(disco('tv', 'popularity.desc', { with_original_language: 'ko|ja|zh|th' }), 'Дорами', call);
                    },
                    function (call) {
                        tmdbList(disco('tv', 'popularity.desc', { with_genres: '16', with_original_language: 'ja' }), 'Аніме', call);
                    },
                    function (call) {
                        tmdbList(disco('tv', 'popularity.desc', { with_genres: '16' }), 'Мультсеріали', call);
                    }
                ];
            } else {
                // anime / cartoon fallback
                parts_data = [
                    function (call) {
                        tmdbList(disco('tv', 'popularity.desc', { with_genres: '16' }), 'Популярне', call);
                    }
                ];
            }

            function loadPart(partLoaded, partEmpty) {
                Lampa.Api.partNext(parts_data, 6, partLoaded, partEmpty);
            }

            loadPart(oncomplite, onerror);
            return loadPart;
        }

        // list / full — делегуємо в TMDB (картки відкриваються нормально)
        function list(params, oncomplite, onerror) {
            params = params || {};
            params.source = 'tmdb';
            return Lampa.Api.sources.tmdb.list(params, function (data) {
                if (data && data.results) data.results = normalize(data.results);
                oncomplite(data);
            }, onerror);
        }

        function full(params, oncomplite, onerror) {
            params = params || {};
            params.source = 'tmdb';
            return Lampa.Api.sources.tmdb.full(params, oncomplite, onerror);
        }

        function search(params, oncomplite) {
            Lampa.Api.sources.tmdb.search(params, function (data) {
                if (data) {
                    if (data.movie && data.movie.results) data.movie.results = normalize(data.movie.results);
                    if (data.tv && data.tv.results) data.tv.results = normalize(data.tv.results);
                }
                oncomplite(data);
            });
        }

        function person(params, oncomplite, onerror) {
            params = params || {};
            params.source = 'tmdb';
            if (Lampa.Api.sources.tmdb.person) {
                return Lampa.Api.sources.tmdb.person(params, oncomplite, onerror);
            }
            onerror();
        }

        function clear() {
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
            clear: clear,
            SOURCE_NAME: SOURCE_NAME,
            SOURCE_TITLE: SOURCE_TITLE
        };

        // Реєстрація джерела
        function register() {
            try {
                if (Lampa.Api.sources[SOURCE_NAME]) {
                    // already
                } else {
                    Lampa.Api.sources[SOURCE_NAME] = UA;
                    Object.defineProperty(Lampa.Api.sources, SOURCE_NAME, {
                        get: function () { return UA; }
                    });
                }

                var sources = {};
                Lampa.Arrays.extend(sources, Lampa.Params.values['source'] || {});
                sources[SOURCE_NAME] = SOURCE_TITLE;

                // зберегти інші відомі
                ['tmdb', 'cub', 'KP', 'pub'].forEach(function (n) {
                    if (Lampa.Api.sources[n] && !sources[n]) {
                        sources[n] = n === 'KP' ? 'KP' : (n === 'cub' ? 'CUB' : n.toUpperCase());
                    }
                });

                Lampa.Params.select('source', sources, Lampa.Storage.field('source') || 'tmdb');
                console.log('[UA Source] registered:', SOURCE_NAME);
            } catch (e) {
                console.log('[UA Source] register error', e);
            }
        }

        register();

        // після ready ще раз (іноді Params пізно)
        if (Lampa.Listener) {
            Lampa.Listener.follow('app', function (e) {
                if (e && e.type === 'ready') register();
            });
        }
    });
})();
