// Generated by CoffeeScript 1.9.0
var __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

require(['base/js/namespace', 'jquery', 'thebe/dotimeout', 'notebook/js/notebook', 'thebe/cookies', 'contents', 'services/config', 'base/js/utils', 'base/js/page', 'base/js/events', 'notebook/js/actions', 'notebook/js/kernelselector', 'services/kernels/kernel', 'codemirror/lib/codemirror', 'custom/custom'], function(IPython, $, doTimeout, notebook, cookies, contents, configmod, utils, page, events, actions, kernelselector, kernel, CodeMirror, custom) {
  var Thebe, codecell;
  Thebe = (function() {
    Thebe.prototype.default_options = {
      selector: 'pre[data-executable]',
      url: 'http://192.168.59.103:8000/spawn/',
      prepend_controls_to: 'html',
      load_css: true,
      load_mathjax: true,
      debug: true
    };

    function Thebe(_at_options) {
      var thebe_url, _ref;
      this.options = _at_options != null ? _at_options : {};
      this.start_notebook = __bind(this.start_notebook, this);
      this.start_kernel = __bind(this.start_kernel, this);
      this.before_first_run = __bind(this.before_first_run, this);
      this.set_state = __bind(this.set_state, this);
      this.build_notebook = __bind(this.build_notebook, this);
      this.spawn_handler = __bind(this.spawn_handler, this);
      this.call_spawn = __bind(this.call_spawn, this);
      window.thebe = this;
      this.has_kernel_connected = false;
      _ref = _.defaults(this.options, this.default_options), this.selector = _ref.selector, this.url = _ref.url, this.debug = _ref.debug;
      if (this.url) {
        this.url = this.url.replace(/\/?$/, '/');
      }
      if (this.url.indexOf('/spawn') !== -1) {
        this.log('this is a tmpnb url');
        this.tmpnb_url = this.url;
        this.url = '';
      }
      this.cells = [];
      this.setup_ui();
      this.events = events;
      this.spawn_handler = _.once(this.spawn_handler);
      thebe_url = cookies.getItem('thebe_url');
      if (thebe_url && this.url === '') {
        this.check_existing_container(thebe_url);
      } else {
        this.start_notebook();
      }
    }

    Thebe.prototype.call_spawn = function(cb) {
      var invo;
      this.log('call spawn');
      invo = new XMLHttpRequest;
      invo.open('GET', this.tmpnb_url, true);
      invo.onreadystatechange = (function(_this) {
        return function(e) {
          return _this.spawn_handler(e, cb);
        };
      })(this);
      invo.onerror = (function(_this) {
        return function() {
          return _this.set_state('disconnected');
        };
      })(this);
      return invo.send();
    };

    Thebe.prototype.check_existing_container = function(url, invo) {
      if (invo == null) {
        invo = new XMLHttpRequest;
      }
      invo.open('GET', url + 'api', true);
      invo.onerror = (function(_this) {
        return function(e) {
          return _this.set_state('disconnected');
        };
      })(this);
      invo.onload = (function(_this) {
        return function(e) {
          try {
            JSON.parse(e.target.responseText);
            _this.url = url;
            _this.start_notebook();
            return _this.log('cookie was right, use that');
          } catch (_error) {
            _this.start_notebook();
            return _this.log('cookie was wrong/dated, call spawn');
          }
        };
      })(this);
      return invo.send();
    };

    Thebe.prototype.spawn_handler = function(e, cb) {
      if (e.target.status === 0) {
        this.set_state('disconnected');
      }
      if (e.target.responseURL.indexOf('/spawn') !== -1) {
        this.log('server full');
        return this.set_state('full');
      } else {
        this.url = e.target.responseURL.replace('/tree', '/');
        this.start_kernel(cb);
        return cookies.setItem('thebe_url', this.url);
      }
    };

    Thebe.prototype.build_notebook = function() {
      this.notebook.writable = false;
      this.notebook._unsafe_delete_cell(0);
      $(this.selector).each((function(_this) {
        return function(i, el) {
          var button, cell;
          cell = _this.notebook.insert_cell_at_bottom('code');
          cell.set_text($(el).text());
          button = $("<button class='run' data-cell-id='" + i + "'>run</button>");
          $(el).replaceWith(cell.element);
          _this.cells.push(cell);
          $(cell.element).prepend(button);
          cell.element.removeAttr('tabindex');
          cell.element.off('dblclick');
          return button.on('click', function(e) {
            if (!_this.has_kernel_connected) {
              return _this.before_first_run(function() {
                button.text('running').addClass('running');
                return cell.execute();
              });
            } else {
              button.text('running').addClass('running');
              return cell.execute();
            }
          });
        };
      })(this));
      this.events.on('kernel_idle.Kernel', (function(_this) {
        return function(e, k) {
          _this.set_state('idle');
          return $('button.run.running').removeClass('running').text('run');
        };
      })(this));
      this.notebook_el.hide();
      this.events.on('kernel_busy.Kernel', (function(_this) {
        return function() {
          return _this.set_state('busy');
        };
      })(this));
      return this.events.on('kernel_disconnected.Kernel', (function(_this) {
        return function() {
          return _this.set_state('disconnected');
        };
      })(this));
    };

    Thebe.prototype.set_state = function(state) {
      return this.log('state :' + state);
    };

    Thebe.prototype.before_first_run = function(cb) {
      if (this.url) {
        return this.start_kernel(cb);
      } else {
        return this.call_spawn(cb);
      }
    };

    Thebe.prototype.start_kernel = function(cb) {
      this.log('start_kernel');
      this.kernel = new kernel.Kernel(this.url + 'api/kernels', '', this.notebook, "python2");
      this.kernel.start();
      this.notebook.kernel = this.kernel;
      return this.events.on('kernel_ready.Kernel', (function(_this) {
        return function() {
          var cell, _i, _len, _ref;
          _this.has_kernel_connected = true;
          _this.log('kernel ready');
          _ref = _this.cells;
          for (_i = 0, _len = _ref.length; _i < _len; _i++) {
            cell = _ref[_i];
            cell.set_kernel(_this.kernel);
          }
          return cb();
        };
      })(this));
    };

    Thebe.prototype.start_notebook = function() {
      var common_options, config_section, keyboard_manager, save_widget;
      contents = {
        list_checkpoints: function() {
          return new Promise(function(resolve, reject) {
            return resolve({});
          });
        }
      };
      keyboard_manager = {
        edit_mode: function() {},
        command_mode: function() {},
        register_events: function() {},
        enable: function() {},
        disable: function() {}
      };
      keyboard_manager.edit_shortcuts = {
        handles: function() {}
      };
      save_widget = {
        update_document_title: function() {},
        contents: function() {}
      };
      config_section = {
        data: {
          data: {}
        }
      };
      common_options = {
        ws_url: '',
        base_url: '',
        notebook_path: '',
        notebook_name: ''
      };
      this.notebook_el = $('<div id="notebook"></div>').prependTo('body');
      this.notebook = new notebook.Notebook('div#notebook', $.extend({
        events: this.events,
        keyboard_manager: keyboard_manager,
        save_widget: save_widget,
        contents: contents,
        config: config_section
      }, common_options));
      this.notebook.kernel_selector = {
        set_kernel: function() {}
      };
      this.events.trigger('app_initialized.NotebookApp');
      this.notebook.load_notebook(common_options.notebook_path);
      return this.build_notebook();
    };

    Thebe.prototype.setup_ui = function() {
      var script, urls;
      window.mathjax_url = '';
      if (this.options.load_mathjax) {
        script = document.createElement("script");
        script.type = "text/javascript";
        script.src = "http://cdn.mathjax.org/mathjax/latest/MathJax.js?config=TeX-AMS-MML_HTMLorMML";
        document.getElementsByTagName("head")[0].appendChild(script);
      }
      if (this.options.load_css) {
        urls = ["https://rawgit.com/oreillymedia/thebe/smarter-starting/static/thebe/style.css", "https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.1.0/codemirror.css", "https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.11.2/jquery-ui.min.css"];
        return $.when($.each(urls, function(i, url) {
          return $.get(url, function() {
            return $('<link>', {
              rel: 'stylesheet',
              type: 'text/css',
              'href': url
            }).appendTo('head');
          });
        })).then((function(_this) {
          return function() {
            return _this.log('loaded css');
          };
        })(this));
      }
    };

    Thebe.prototype.log = function() {
      var x;
      if (this.debug) {
        return console.log("%c" + [
          (function() {
            var _i, _len, _results;
            _results = [];
            for (_i = 0, _len = arguments.length; _i < _len; _i++) {
              x = arguments[_i];
              _results.push(x);
            }
            return _results;
          }).apply(this, arguments)
        ], "color: blue; font-size: 12px");
      }
    };

    return Thebe;

  })();
  codecell = require('notebook/js/codecell');
  codecell.CodeCell.options_default.cm_config.viewportMargin = Infinity;
  $(function() {
    var thebe;
    return thebe = new Thebe();
  });
  return Thebe;
});

//# sourceMappingURL=main.js.map
