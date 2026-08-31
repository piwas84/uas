(function () {
    'use strict';

    if (window.ua_home_plugin) return;
    window.ua_home_plugin = true;

    function buildCategories(type) {
        if (type === 'uaflix') {
            return [
                { title: 'Новинки', url: '/3/trending/all/week' },
                { title: 'Топ IMDb', url: '/3/movie/top_rated' },
                { title: 'Популярні фільми', url: '/3/discover/movie?sort_by=popularity.desc' },
                { title: 'Зараз у кіно', url: '/3/movie/now_playing' },
                { title: 'Мультфільми', url: '/3/discover/movie?sort_by=popularity.desc&with_genres=16' },
                { title: 'Дорами', url: '/3/discover/tv?sort_by=popularity.desc&with_original_language=ko|ja|zh|th' }
            ];
        }
        return [
            { title: 'Нові серії', url: '/3/tv/on_the_air' },
            { title: 'Популярні серіали', url: '/3/discover/tv?sort_by=popularity.desc' },
            { title: 'Топ серіалів', url: '/3/tv/top_rated' },
            { title: 'Тренди серіалів', url: '/3/trending/tv/week' },
            { title: 'Дорами', url: '/3/discover/tv?sort_by=popularity.desc&with_original_language=ko|ja|zh|th' },
            { title: 'Аніме', url: '/3/discover/tv?sort_by=popularity.desc&with_genres=16&with_original_language=ja' },
            { title: 'Мультсеріали', url: '/3/discover/tv?sort_by=popularity.desc&with_genres=16' }
        ];
    }

    function tmdbUrl(path) {
        var key = Lampa.TMDB.key();
        var join = path.indexOf('?') >= 0 ? '&' : '?';
        return 'https://api.themoviedb.org' + path + join + 'api_key=' + key + '&language=uk';
    }

    function Component(object) {
        var network = new Lampa.Reguest();
        var scroll = new Lampa.Scroll({ mask: true, over: true, step: 250 });
        var items = [];
        var html = $('<div class="ua-home"></div>');
        var body = $('<div class="category-full"></div>');
        var type = (object && object.type) || 'uaflix';
        var categories = buildCategories(type);
        var loaded = 0;
        var self = this;

        this.create = function () {
            this.activity.loader(true);

            scroll.minus();
            scroll.append(body);
            html.append(scroll.render());

            categories.forEach(function (cat) {
                network.silent(tmdbUrl(cat.url), function (json) {
                    loaded++;
                    if (json && json.results && json.results.length) {
                        appendLine(cat.title, json.results.slice(0, 18));
                    }
                    finishLoad();
                }, function () {
                    loaded++;
                    finishLoad();
                });
            });

            return this.render();
        };

        function finishLoad() {
            if (loaded < categories.length) return;
            self.activity.loader(false);
            if (items.length) {
                self.activity.toggle();
            } else {
                body.append('<div class="empty__text" style="padding:2em;text-align:center">Немає даних</div>');
                self.activity.toggle();
            }
        }

        function appendLine(title, results) {
            var line = Lampa.Template.get('items_line', { title: title });
            var lineBody = line.find('.items-line__body');

            results.forEach(function (elem) {
                if (!elem.poster_path && !elem.backdrop_path) return;

                elem.source = 'tmdb';
                if (!elem.media_type) {
                    elem.media_type = (elem.first_air_date || elem.name) ? 'tv' : 'movie';
                }

                var card = Lampa.Template.get('card', {
                    title: elem.title || elem.name,
                    release_year: ((elem.release_date || elem.first_air_date || '') + '').slice(0, 4)
                });

                card.addClass('card--small selector');

                var img = card.find('.card__img');
                img.attr('src', Lampa.TMDB.image('t/p/w300' + (elem.poster_path || elem.backdrop_path)));
                img.on('load', function () {
                    card.addClass('card--loaded');
                });

                card.on('hover:focus', function () {
                    scroll.update(card, true);
                });

                card.on('hover:enter', function () {
                    Lampa.Activity.push({
                        url: '',
                        component: 'full',
                        id: elem.id,
                        method: elem.media_type === 'tv' ? 'tv' : 'movie',
                        card: elem,
                        source: 'tmdb'
                    });
                });

                lineBody.append(card);
                items.push(card);
            });

            if (lineBody.children().length) {
                body.append(line);
            }
        }

        this.start = function () {
            if (Lampa.Activity.active() && Lampa.Activity.active().activity !== this.activity) return;

            Lampa.Controller.add('content', {
                toggle: function () {
                    Lampa.Controller.collectionSet(scroll.render());
                    Lampa.Controller.collectionFocus(false, scroll.render());
                },
                left: function () {
                    if (Navigator.canmove('left')) Navigator.move('left');
                    else Lampa.Controller.toggle('menu');
                },
                right: function () {
                    if (Navigator.canmove('right')) Navigator.move('right');
                },
                up: function () {
                    if (Navigator.canmove('up')) Navigator.move('up');
                    else Lampa.Controller.toggle('head');
                },
                down: function () {
                    if (Navigator.canmove('down')) Navigator.move('down');
                },
                back: function () {
                    Lampa.Activity.backward();
                }
            });

            Lampa.Controller.toggle('content');
        };

        this.pause = function () {};
        this.stop = function () {};
        this.render = function () { return html; };
        this.destroy = function () {
            network.clear();
            scroll.destroy();
            html.remove();
            items = [];
        };
    }

    function pushHome(type) {
        Lampa.Activity.push({
            url: '',
            title: type === 'uaflix' ? 'UAFlix' : 'UA Serial',
            component: 'ua_home',
            type: type,
            page: 1
        });
    }

    function addMenu(title, type, path) {
        var btn = $(
            '<li class="menu__item selector">' +
            '<div class="menu__ico"><svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24"><path d="' + path + '"/></svg></div>' +
            '<div class="menu__text">' + title + '</div></li>'
        );
        btn.on('hover:enter', function () { pushHome(type); });
        var list = $('.menu .menu__list').eq(0);
        if (list.length) list.append(btn);
    }

    function startPlugin() {
        Lampa.Component.add('ua_home', Component);

        addMenu('UAFlix', 'uaflix', 'M18 4l2 4h-3l-2-4h-2l2 4h-3l-2-4H8l2 4H7L5 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V4h-4z');
        addMenu('UA Serial', 'uaserial', 'M21 3H3c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h5v2h8v-2h5c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 14H3V5h18v12z');

        if (Lampa.SettingsApi && Lampa.SettingsApi.addParam) {
            Lampa.SettingsApi.addParam({
                component: 'interface',
                param: {
                    name: 'ua_home_main',
                    type: 'select',
                    values: { off: 'Вимкнено', uaflix: 'UAFlix', uaserial: 'UA Serial' },
                    default: 'off'
                },
                field: {
                    name: 'UA Home як головна',
                    description: 'Відкривати UAFlix або UA Serial при старті'
                },
                onChange: function (v) { Lampa.Storage.set('ua_home_main', v); }
            });
        }

        var main = Lampa.Storage.get('ua_home_main', 'off');
        if (main === 'uaflix' || main === 'uaserial') {
            Lampa.Listener.follow('app', function (e) {
                if (e.type === 'ready') {
                    setTimeout(function () {
                        try {
                            Lampa.Activity.replace({
                                url: '',
                                title: main === 'uaflix' ? 'UAFlix' : 'UA Serial',
                                component: 'ua_home',
                                type: main,
                                page: 1
                            });
                        } catch (err) {
                            pushHome(main);
                        }
                    }, 1500);
                }
            });
        }
    }

    if (window.appready) startPlugin();
    else Lampa.Listener.follow('app', function (e) { if (e.type === 'ready') startPlugin(); });
})();
