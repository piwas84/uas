(function () {
    'use strict';

    if (window.ua_home_plugin) return;
    window.ua_home_plugin = true;

    // ========== Спільний компонент ==========
    function createComponent(type) {
        return function (object) {
            var network = new Lampa.Reguest();
            var scroll  = new Lampa.Scroll({ mask: true, over: true, step: 250 });
            var items   = [];
            var active  = 0;
            var html    = $('<div class="category-full"></div>');
            var api_key = Lampa.TMDB.key();

            // Ряди залежно від типу
            var categories = [];

            if (type === 'uaflix') {
                categories = [
                    { title: 'Новинки',           url: 'https://api.themoviedb.org/3/trending/all/week?language=uk' },
                    { title: 'Топ IMDb (фільми)',  url: 'https://api.themoviedb.org/3/movie/top_rated?language=uk' },
                    { title: 'Популярні фільми',   url: 'https://api.themoviedb.org/3/discover/movie?language=uk&sort_by=popularity.desc' },
                    { title: 'Нові фільми',        url: 'https://api.themoviedb.org/3/movie/now_playing?language=uk' },
                    { title: 'Мультфільми',        url: 'https://api.themoviedb.org/3/discover/movie?language=uk&sort_by=popularity.desc&with_genres=16' },
                    { title: 'Дорами',             url: 'https://api.themoviedb.org/3/discover/tv?language=uk&sort_by=popularity.desc&with_original_language=ko|ja|zh|th' }
                ];
            } else { // uaserial
                categories = [
                    { title: 'Нові серії',         url: 'https://api.themoviedb.org/3/tv/on_the_air?language=uk' },
                    { title: 'Популярні серіали',  url: 'https://api.themoviedb.org/3/discover/tv?language=uk&sort_by=popularity.desc' },
                    { title: 'Топ серіалів',       url: 'https://api.themoviedb.org/3/tv/top_rated?language=uk' },
                    { title: 'Новинки серіалів',   url: 'https://api.themoviedb.org/3/trending/tv/week?language=uk' },
                    { title: 'Дорами',             url: 'https://api.themoviedb.org/3/discover/tv?language=uk&sort_by=popularity.desc&with_original_language=ko|ja|zh|th' },
                    { title: 'Аніме',              url: 'https://api.themoviedb.org/3/discover/tv?language=uk&sort_by=popularity.desc&with_genres=16&with_original_language=ja' },
                    { title: 'Мультсеріали',       url: 'https://api.themoviedb.org/3/discover/tv?language=uk&sort_by=popularity.desc&with_genres=16' }
                ];
            }

            this.create = function () {
                this.activity.loader(true);

                var line = 0;
                var self = this;

                function next() {
                    if (line >= categories.length) {
                        self.activity.loader(false);
                        self.activity.toggle();
                        return;
                    }

                    var cat = categories[line++];
                    var url = cat.url + (cat.url.indexOf('?') > -1 ? '&' : '?') + 'api_key=' + api_key;

                    network.silent(url, function (json) {
                        if (json && json.results && json.results.length) {
                            var results = json.results
                                .filter(function (r) { return r.poster_path || r.backdrop_path; })
                                .slice(0, 18);

                            if (results.length) {
                                var body = Lampa.Template.get('items_line', { title: cat.title });

                                results.forEach(function (elem) {
                                    elem.source = 'tmdb';
                                    if (!elem.media_type) {
                                        elem.media_type = (elem.first_air_date || elem.name) ? 'tv' : 'movie';
                                    }

                                    var card = Lampa.Template.get('card', {
                                        title: elem.title || elem.name,
                                        release_year: (elem.release_date || elem.first_air_date || '----').slice(0, 4)
                                    });

                                    card.addClass('card--small');

                                    card.find('.card__img')[0].onload = function () {
                                        card.addClass('card--loaded');
                                    };

                                    card.find('.card__img').attr(
                                        'src',
                                        Lampa.TMDB.image('t/p/w300' + (elem.poster_path || elem.backdrop_path))
                                    );

                                    card.on('hover:focus', function () {
                                        active = items.indexOf(card);
                                        scroll.update(card, true);
                                    }).on('hover:enter', function () {
                                        Lampa.Activity.push({
                                            url: '',
                                            component: 'full',
                                            id: elem.id,
                                            method: elem.media_type === 'tv' ? 'tv' : 'movie',
                                            card: elem,
                                            source: 'tmdb'
                                        });
                                    });

                                    body.find('.items-line__body').append(card);
                                    items.push(card);
                                });

                                html.append(body);
                            }
                        }
                        next();
                    }, function () {
                        next();
                    }, false, { timeout: 10000 });
                }

                next();
                return this.render();
            };

            this.start = function () {
                Lampa.Controller.add('content', {
                    toggle: function () {
                        Lampa.Controller.collectionSet(scroll.render());
                        Lampa.Controller.collectionFocus(items[active] || false, scroll.render());
                    },
                    left: function () {
                        if (Navigator.canmove('left')) Navigator.move('left');
                        else Lampa.Controller.toggle('menu');
                    },
                    right: function () { Navigator.move('right'); },
                    up: function () {
                        if (Navigator.canmove('up')) Navigator.move('up');
                        else Lampa.Controller.toggle('head');
                    },
                    down: function () {
                        if (Navigator.canmove('down')) Navigator.move('down');
                    },
                    back: this.back
                });
                Lampa.Controller.toggle('content');
            };

            this.refresh = function () {};
            this.pause   = function () {};
            this.stop    = function () {};
            this.render  = function () { return html; };
            this.destroy = function () {
                network.clear();
                scroll.destroy();
                html.remove();
            };
            this.back = function () {
                Lampa.Activity.backward();
            };
        };
    }

    // ========== Реєстрація ==========
    function startPlugin() {
        Lampa.Component.add('uaflix_home', createComponent('uaflix'));
        Lampa.Component.add('uaserial_home', createComponent('uaserial'));

        // ----- Кнопка UAFlix -----
        var btnFlix = $(`
            <li class="menu__item selector" data-action="uaflix_home">
                <div class="menu__ico">
                    <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
                        <path d="M18 4l2 4h-3l-2-4h-2l2 4h-3l-2-4H8l2 4H7L5 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V4h-4z"/>
                    </svg>
                </div>
                <div class="menu__text">UAFlix</div>
            </li>
        `);

        btnFlix.on('hover:enter', function () {
            Lampa.Activity.push({
                url: '',
                title: 'UAFlix',
                component: 'uaflix_home',
                page: 1
            });
        });

        // ----- Кнопка UA Serial -----
        var btnSerial = $(`
            <li class="menu__item selector" data-action="uaserial_home">
                <div class="menu__ico">
                    <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
                        <path d="M21 3H3c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h5v2h8v-2h5c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 14H3V5h18v12z"/>
                    </svg>
                </div>
                <div class="menu__text">UA Serial</div>
            </li>
        `);

        btnSerial.on('hover:enter', function () {
            Lampa.Activity.push({
                url: '',
                title: 'UA Serial',
                component: 'uaserial_home',
                page: 1
            });
        });

        $('.menu .menu__list').eq(0).append(btnFlix);
        $('.menu .menu__list').eq(0).append(btnSerial);

        // ----- Налаштування: яка головна -----
        Lampa.SettingsApi.addParam({
            component: 'interface',
            param: {
                name: 'ua_home_main',
                type: 'select',
                values: {
                    'off': 'Вимкнено',
                    'uaflix': 'UAFlix',
                    'uaserial': 'UA Serial'
                },
                default: 'off'
            },
            field: {
                name: 'UA Home як головна',
                description: 'Яку сторінку відкривати при старті та по кнопці Home'
            },
            onChange: function (value) {
                Lampa.Storage.set('ua_home_main', value);
            }
        });

        // Автозапуск головної
        var main = Lampa.Storage.get('ua_home_main', 'off');

        if (main === 'uaflix' || main === 'uaserial') {
            Lampa.Listener.follow('app', function (e) {
                if (e.type === 'ready') {
                    setTimeout(function () {
                        Lampa.Activity.push({
                            url: '',
                            title: main === 'uaflix' ? 'UAFlix' : 'UA Serial',
                            component: main === 'uaflix' ? 'uaflix_home' : 'uaserial_home',
                            page: 1
                        });
                    }, 900);
                }
            });
        }
    }

    if (window.appready) startPlugin();
    else {
        Lampa.Listener.follow('app', function (e) {
            if (e.type === 'ready') startPlugin();
        });
    }
})();
