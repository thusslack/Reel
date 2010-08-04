/**
          @@@@@@@@@@@@@@
      @@@@@@@@@@@@@@@@@@@@@@
    @@@@@@@@          @@@@@@@@
  @@@@@@@                @@@@@@@
 @@@@@@@                  @@@@@@@
 @@@@@@@                  @@@@@@@
 @@@@@@@@     @          @@@@@@@@
  @@@@@@@@@  @@@       @@@@@@@@@
   @@@@@@@@@@@@@@   @@@@@@@@@@@
     @@@@@@@@@@@@@    @@@@@@@
       @@@@@@@@@@@@     @@@
          @@@@@@
         @@@@
        @@
 *
 * jQuery Reel
 * ===========
 * 360° projection plugin for jQuery
 *
 * @license Copyright (c) 2009-2010 Petr Vostrel (http://petr.vostrel.cz/)
 * Dual licensed under the MIT (MIT-LICENSE.txt)
 * and GPL (GPL-LICENSE.txt) licenses.
 *
 * http://jquery.vostrel.cz/reel
 * Version: "Dancer" (will be 1.1 on release)
 * Updated: 2010-07-19
 *
 * Requires jQuery 1.4.x
 */
/*
 * Have it served by a cloud CDN:
 * - http://code.vostrel.cz/jquery.reel-bundle.js (recommended)
 * - http://code.vostrel.cz/jquery.reel.js
 * - http://code.vostrel.cz/jquery.reel-debug.js
 *
 * Optional nice-to-have plugins:
 * - jQuery.disableTextSelect [B] (James Dempster, http://www.jdempster.com/category/jquery/disabletextselect/)
 * - jQuery.mouseWheel [B] (Brandon Aaron, http://plugins.jquery.com/project/mousewheel)
 * - or jQuery.event.special.wheel (Three Dub Media, http://blog.threedubmedia.com/2008/08/eventspecialwheel.html)
 *
 * [B] Marked plugins are contained (with permissions) in the "bundle" version
 */

(function($, window, document, undefined){
  var
    defaults= $.reel= {
      footage:            6, // number of frames per line/column
      frame:              1, // initial frame
      frames:            36, // total number of frames; every 10° for full rotation
      hint:              '', // hotspot hint tooltip
      horizontal:      true, // roll flow; defaults to horizontal
      hotspot:    undefined, // custom jQuery as a hotspot
      indicator:          0, // size of a visual indicator of reeling (in pixels)
      klass:             '', // plugin instance class name
      loops:           true, // is it a loop?
      reversed:       false, // [deprecated] use `cw` instead
      sensitivity:       20, // [deprecated] interaction sensitivity
      spacing:            0, // space between frames on reel
      stitched:   undefined, // pixel width (length) of a stitched (rectilinear) panoramic reel
      suffix:       '-reel', // sprite filename suffix (A.jpg's sprite is A-reel.jpg by default)
      tooltip:           '', // [deprecated] use `hint` instead

      // [NEW] in version 1.1
      cw:             false, // true for clockwise sprite organization
      delay:             -1, // delay before autoplay in seconds (no autoplay by default)
      friction:         0.9, // friction of the rotation inertia (will loose 90% of speed per second)
      graph:      undefined,
      image:      undefined, // image sprite to be used
      images:            [], // sequence array of individual images to be used instead of sprite
      inertia:         true, // drag & throw will give the rotation a momentum when true
      monitor:    undefined, // stored value name to monitor in the upper left corner of the viewport
      path:              '', // URL path to be prepended to `image` or `images` filenames
      preloader:          4, // size (height) of a image loading indicator (in pixels)
      rebound:          0.5, // time spent on the edge (in seconds) of a non-looping panorama before it bounces back
      revolution: undefined, // distance mouse must be dragged for full revolution
                             // (defaults to double the viewport size or half the `stitched` option)
      speed:              0, // animated rotation speed in revolutions per second (Hz)
      step:       undefined, // initial step (overrides `frame`)
      steps:      undefined, // number of steps a revolution is divided in (by default equal to `frames`)
      tempo:             25, // shared ticker tempo in ticks per second
      timeout:            2  // idle timeout in seconds
    }
    // [deprecated] options may be gone anytime soon

  $.fn.reel= function(options){
    var
      opt= $.extend({}, defaults, options),
      applicable= (function(tags){
        // Only IMG tags with non-empty SRC and non-zero WIDTH and HEIGHT will pass
        var
          pass= []
        tags.filter(_img_).each(function(ix){
          var
            $this= $(this),
            src= opt.images.length && opt.images || opt.image || $this.attr(_src_),
            width= number($this.css(_width_)),
            height= number($this.css(_height_))
          if (!src || src == __ || !width || !height) return;
          pass.push($this);
        });
        tags.filter(_div_ + dot(klass)).each(function(ix){
          pass.push($(this));
        });
        return $(pass);
      })(this),
      instances= [],
      ticker_timeout= 1000 / opt.tempo

    ticker= ticker || (function tick(){
      pool.trigger(tick_event);
      return setTimeout(tick, 1000 / opt.tempo);
    })();

    applicable.each(function(){
      var
        t= $(this),

        // Data storage
        set= function(name, value){
          t.data(name, value);
          t.trigger('store');
          return value;
        },
        get= function(name){
          t.trigger('recall')
          return t.data(name);
        },

        // Garbage clean-up facility called by every event
        cleanup= function(pass){ delete this; return pass },

        // Events & handlers
        on= {
          setup: function(e){
            if (t.hasClass(klass)) return cleanup.call(e);
            var
              src= t.attr(_src_),
              id= t.attr(_id_),
              classes= t.attr(_class_),
              styles= t.attr('style'),
              images= opt.images,
              size= { x: number(t.css(_width_)), y: number(t.css(_height_)) },
              image_src= opt.images ? transparent : src,
              style= {
                display: 'block',
                width: size.x + _px_,
                height: size.y + _px_
              },
              $instance= t.attr({ src: image_src }).bind(on).addClass(klass).css(style),
              $instance= $instance.bind(unidle_events, unidle).bind(idle_events, idle)
              instances_count= instances.push($instance[0])
            set(_image_, images.length && images.length || opt.image || src.replace(/^(.*)\.(jpg|jpeg|png|gif)$/, '$1' + opt.suffix + '.$2'));
            set(_frame_, opt.frame);
            set(_spacing_, opt.spacing);
            set(_dimensions_, size);
            set(_fraction_, 0);
            set(_steps_, opt.steps || opt.frames);
            set(_revolution_, opt.revolution || opt.stitched / 2 || size.x);
            set(_rows_, ceil(set(_frames_, images.length || opt.frames) / opt.footage));
            set(_bit_, 1 / (get(_frames_) - (opt.loops ? 0 : 1)));
            set(_wheel_step_, 1 / max(get(_frames_), get(_steps_)));
            set(_stitched_travel_, opt.stitched + (opt.loops ? 0 : -size.x));
            set(_indicator_travel_, size.x - opt.indicator);
            set(_stage_, '#'+id+opt.suffix);
            set(_reversed_, set(_speed_, opt.speed) < 0);
            set(_velocity_, 0);
            set(_cwish_, negative_when(1, !opt.cw && !opt.stitched));
            set(_backup_, {
              src: src,
              style: styles || __
            });
            ticker && pool.bind(tick_event, on.tick);
            cleanup.call(e);
            t.trigger('start');
          },
          teardown: function(e){
            $(get(_stage_)).remove();
            t.removeClass(klass)
            .unbind(ns).unbind(on)
            .unbind(unidle_events, unidle).unbind(idle_events, idle)
            .attr(t.data(_backup_))
            .enableTextSelect()
            .removeData();
            no_bias();
            pool
            .unbind(_mouseup_).unbind(_mousemove_)
            .unbind(tick_event, on.tick);
            cleanup.call(e);
          },
          start: function(e){
            var
              space= get(_dimensions_),
              frames= get(_frames_),
              resolution= max(frames, get(_steps_)),
              fraction= set(_fraction_, 1 / resolution * ((opt.step || opt.frame) - 1)),
              frame= set(_frame_, fraction * frames + 1),
              image= get(_image_),
              images= opt.images,
              loaded= 0,
              preload= !images.length ? [image] : new Array().concat(images),
              $preloader,
              id= t.attr('id'),
              img_tag= t[0],
              img_frames= img_tag.frames= preload.length,
              img_preloads= img_tag.preloads= img_tag.preloads || [],
              img_preloaded= img_tag.preloaded= img_tag.preloaded || 0,
              preload_images= preload.length != img_tag.preloads.length,
              overlay_id= get(_stage_).substr(1),
              overlay_css= { position: 'relative', width: space.x },
              $overlay= $(_div_tag_, { className: overlay_klass, id: overlay_id, css: overlay_css }).insertAfter(t),
              $hi= $(_div_tag_, { className: hi_klass,
                css: { position: _absolute_, left: 0, top: -space.y, width: space.x, height: space.y }
              }).appendTo($overlay),
              hotspot= set(_hotspot_, $(opt.hotspot || $hi ))
            if (!touchy) hotspot
              .css({ cursor: 'url('+drag_cursor+'), '+failsafe_cursor })
              .bind(_mouseenter_, function(e){ t.trigger('enter') })
              .bind(_mouseleave_, function(e){ t.trigger('leave') })
              .bind(_mousemove_, function(e){ t.trigger('over', [e.pageX, e.pageY]) })
              .bind(_mousewheel_, function(e, delta){ t.trigger('wheel', [delta]); return false })
              .bind(_dblclick_, function(e){ t.trigger('animate') })
              .bind(_mousedown_, function(e){ t.trigger('down', [e.clientX, e.clientY]); return false })
              .disableTextSelect()
            else hotspot
              .css({ WebkitUserSelect: 'none' })
              .each(function touch_support(){
                bind(this, {
                  touchstart: start,
                  touchmove: move,
                  touchend: end,
                  touchcancel: end
                });
                function bind(element, events){
                  $.each(events, function bind_handler(event){
                    element.addEventListener(event, this, false);
                  });
                }
                function prevent(event){
                  return event.cancelable && event.preventDefault() || false;
                }
                function start(event){
                  var
                    touch= event.touches[0]
                  t.trigger('down', [touch.clientX, touch.clientY, true])
                  return prevent(event);
                }
                function move(event){
                  var
                    touch= event.touches[0]
                  t.trigger('drag', [touch.clientX, touch.clientY, true]);
                  return prevent(event);
                }
                function end(event){
                  t.trigger('up', [true]);
                  return prevent(event);
                }
              });
            (opt.hint || opt.tooltip) && hotspot.attr(_title_, opt.hint || opt.tooltip);
            opt.monitor && $overlay.append($monitor= $(_div_tag_, {
              className: monitor_klass,
              css: { position: _absolute_, left: 0, top: -space.y }
            })) || ($monitor= $());
            opt.indicator && $overlay.append($(_div_tag_, {
              className: indicator_klass,
              css: {
                width: opt.indicator + _px_,
                height: opt.indicator + _px_,
                top: (-opt.indicator) + _px_,
                position: _absolute_,
                backgroundColor: _hex_black_
              }
             }));
            // Preloading of image(s)
            preload_images && $overlay.append($preloader= $(_div_tag_, {
              className: preloader_klass,
              css: {
                position: _absolute_,
                left: 0,
                top: -opt.preloader,
                height: opt.preloader,
                backgroundColor: _hex_black_
              }
            }));
            if (preload_images) while(preload.length){
              var
                img= new Image(),
                url= opt.path+preload.shift()
              $(img).load(function update_preloader(){
                img_tag.preloaded++
                $preloader.css({ width: 1 / img_tag.frames * img_tag.preloaded * space.x })
                if (img_tag.frames == img_tag.preloaded) $preloader.remove()
              })
              img.src= url;
              img_tag.preloads.push(img)
            }
            opt.delay > 0 && unidle();
            cleanup.call(e);
            t.trigger('frameChange');
          },
          animate: function(e){
            // Stub for future compatibility
            // log(e.type);
          },
          tick: function(e){
            var
              velocity= get(_velocity_)
            if (breaking) var
              breaked= round_to(3, velocity - (tick_friction * breaking)),
              done= velocity * breaked <= 0 || abs(velocity) < abs(breaked),
              velocity= !done && set(_velocity_, abs(velocity) > abs(opt.speed) ? breaked : (breaking= operated= 0))
            $monitor.text(get(opt.monitor));
            velocity && breaking++;
            operated && operated++;
            to_bias(0);
            if (operated && !velocity) return cleanup.call(e);
            if (get(_clicked_)) return cleanup.call(e, unidle());
            var
              backwards= get(_cwish_) * negative_when(1, get(_backwards_)),
              step= (get(_stopped_) ? velocity : get(_speed_) + velocity) / opt.tempo,
              fraction= set(_fraction_, get(_fraction_) + step * backwards)
            cleanup.call(e);
            t.trigger('fractionChange');
          },
          play: function(e, direction){
            var
              playing= set(_playing_, true),
              stopped= set(_stopped_, !playing)
            cleanup.call(e);
          },
          pause: function(e){
            var
              playing= set(_playing_, false)
            cleanup.call(e);
          },
          stop: function(e){
            var
              stopped= set(_stopped_, true),
              playing= set(_playing_, !stopped)
            cleanup.call(e);
          },
          down: function(e, x, y, touched){
            var
              clicked= set(_clicked_, true),
              velocity= set(_velocity_, 0),
              origin= recenter_mouse(x, get(_fraction_), get(_revolution_)),
              xx= last_x= undefined
            no_bias();
            !touched && pool
            .bind(_mousemove_, function(e){ t.trigger('drag', [e.clientX, e.clientY]); cleanup.call(e) })
            .bind(_mouseup_, function(e){ t.trigger('up'); cleanup.call(e) }) && get(_hotspot_)
            .css({ cursor: url(drag_cursor_down)+', '+failsafe_cursor });
            cleanup.call(e);
          },
          up: function(e, touched){
            var
              clicked= set(_clicked_, false),
              velocity= set(_velocity_, !opt.inertia ? 0 : abs(bias[0] + bias[1] + bias[2]) / 60),
              breaks= breaking= velocity ? 1 : 0
            velocity ? idle() : unidle();
            no_bias();
            !touched && pool
            .unbind(_mouseup_).unbind(_mousemove_) && get(_hotspot_)
            .css({ cursor: url(drag_cursor)+', '+failsafe_cursor });
            cleanup.call(e);
          },
          drag: function(e, x, y, touched){
            var
              revolution= get(_revolution_),
              origin= get(_clicked_location_),
              then= get(_distance_dragged_),
              now= set(_distance_dragged_, x - origin),
              fraction= set(_fraction_, graph(now, get(_clicked_on_), revolution, get(_lo_), get(_hi_), get(_cwish_)))
            if (fraction % 1 && !opt.loops) var
              origin= recenter_mouse(x, fraction, revolution)
            else var
              backwards= then != now && set(_backwards_, then < now)
            last_x && to_bias(x - last_x);
            last_x= x;
            cleanup.call(e);
            t.trigger('fractionChange');
          },
          wheel: function(e, distance){
            var
              delta= ceil(sqrt(abs(distance)) / 2),
              delta= negative_when(delta, distance > 0),
              revolution= 0.2 * get(_revolution_), // Wheel's revolution is just 20 % of full revolution
              origin= recenter_mouse(undefined, get(_fraction_), revolution),
              fraction= set(_fraction_, graph(delta, get(_clicked_on_), revolution, get(_lo_), get(_hi_), get(_cwish_))),
              backwards= delta && set(_backwards_, delta > 0),
              velocity= set(_velocity_, 0)
            cleanup.call(e);
            t.trigger('fractionChange');
            return false;
          },
          fractionChange: function(e, fraction){
            var
              fraction= !fraction ? get(_fraction_) : set(_fraction_, fraction),
              delta= fraction - get(_last_fraction_)
            if (delta === 0) return cleanup.call(e);
            var
              fraction= opt.loops ? fraction - floor(fraction) : min_max(0, 1, fraction),
              bounce= !opt.loops && opt.rebound && on_edge == opt.rebound * 1000 / opt.tempo,
              reversed= bounce && set(_reversed_, !get(_reversed_)),
              fraction= set(_last_fraction_, set(_fraction_, round_to(6, fraction))),
              frame= set(_frame_, floor(fraction / get(_bit_) + 1))
            !operated && (fraction == 0 || fraction == 1 ? on_edge++ : (on_edge= 0));
            cleanup.call(e);
            t.trigger('frameChange');
          },
          frameChange: function(e, frame){
            var
              fraction= !frame ? get(_fraction_) : set(_fraction_, round_to(6, get(_bit_) * (frame-1))),
              frame= set(_frame_, round(frame ? frame : get(_frame_))),
              images= opt.images,
              space= get(_dimensions_),
              steps= get(_steps_),
              spacing= get(_spacing_),
              footage= opt.footage,
              horizontal= opt.horizontal
            if (!opt.stitched){
              var
                minor= (frame % footage) - 1,
                minor= minor < 0 ? footage - 1 : minor,
                major= floor((frame - 0.1) / footage),
                major= major + (!get(_reversed_) ? get(_rows_) : 0),
                // Count new positions
                a= major * ((horizontal ? space.y : space.x) + spacing),
                b= minor * ((horizontal ? space.x : space.y) + spacing),
                shift= images.length ? [0, 0] : horizontal ? [-b + _px_, -a + _px_] : [-a + _px_, -b + _px_]
            }else{
              var
                x= round(fraction * get(_stitched_travel_)),
                y= 0,
                shift= [-x + _px_, y + _px_]
            }
            var
              sprite= images[frame - 1] || get(_image_),
              travel= get(_indicator_travel_),
              indicator= min_max(0, travel, round(fraction * (travel+2)) - 1),
              css= { background: url(opt.path+sprite)+___+shift.join(___) }
            opt.images.length ? t.attr({ src: opt.path+sprite }) : t.css(css);
            cleanup.call(e);
            $(dot(indicator_klass), get(_stage_)).css({ left: indicator + _px_ });
          }
        },

        // User idle control
        operated,
        breaking= 0,
        idle= function(){ return operated= 0 },
        unidle= function(){ return operated= -opt.timeout * opt.tempo },

        tick_friction= opt.friction / opt.tempo,
        $monitor,

        // Inertia rotation control
        on_edge= 0,
        last_x= 0,
        last_velocity= 0,
        to_bias= function(value){ bias.push(value) && bias.shift() },
        no_bias= function(){ return bias= [0,0,0] },
        bias= no_bias(),

        // Graph function to be used
        graph= opt.graph || (opt.loops ? hatching : enveloping),

        // Resets the interaction graph's zero point
        recenter_mouse= function(x, fraction, revolution){
          set(_clicked_on_, fraction);
          set(_lo_, opt.loops ? 0 : - fraction * revolution);
          set(_hi_, opt.loops ? revolution : revolution - fraction * revolution);
          return x && set(_clicked_location_, x) || undefined
        }

      on.setup();
    });
    return $(instances);
  }

  // Double plugin functions in case plugin is missing
  double_for('mousewheel disableTextSelect enableTextSelect'.split(/ /));

  // PRIVATE
  var
    ns= '.reel',
    klass= 'jquery-reel',
    overlay_klass= klass + '-overlay',
    indicator_klass= 'indicator',
    preloader_klass= 'preloader',
    monitor_klass= 'monitor',
    hi_klass= 'interface',
    tick_event= 'tick'+ns,
    unidle_events= 'down drag wheel pause',
    idle_events= 'play',
    pool= $(document),
    touchy= (/iphone|ipod|ipad|android/i).test(navigator.userAgent),
    failsafe_cursor= 'w-resize',
    ticker,

    // Embedded images
    transparent= 'data:image/gif;base64,R0lGODlhCAAIAIAAAAAAAAAAACH5BAEAAAAALAAAAAAIAAgAAAIHhI+py+1dAAA7',
    drag_cursor= 'data:image/gif;base64,R0lGODlhEAAQAJECAAAAAP///////wAAACH5BAEAAAIALAAAAAAQABAAQAI3lC8AeBDvgosQxQtne7yvLWGStVBelXBKqDJpNzLKq3xWBlU2nUs4C/O8cCvU0EfZGUwt19FYAAA7',
    drag_cursor_down= 'data:image/gif;base64,R0lGODlhEAAQAJECAAAAAP///////wAAACH5BAEAAAIALAAAAAAQABAAQAIslI95EB3MHECxNjBVdE/5b2zcRV1QBabqhwltq41St4hj5konmVioZ6OtEgUAOw==',

    // Shortcuts
    round= Math.round, floor= Math.floor, ceil= Math.ceil,
    min= Math.min, max= Math.max, abs= Math.abs, sqrt= Math.sqrt,
    number= parseInt,

    // Storage keys
    _backup_= 'backup', _backwards_= 'backwards', _bit_= 'bit', _clicked_= 'clicked',
    _clicked_location_= 'clicked_location', _cwish_= 'cwish', _clicked_on_= 'clicked_on',
    _dimensions_= 'dimensions', _distance_dragged_= 'distance_dragged', _fraction_= 'fraction',
    _frame_= 'frame', _frames_= 'frames', _hi_= 'hi', _hotspot_= 'hotspot', _image_= 'image',
    _indicator_travel_= 'indicator_travel', _last_fraction_= 'last_fraction', _lo_= 'lo',
    _playing_= 'playing', _reversed_= 'reversed', _revolution_= 'revolution', _rows_= 'rows',
    _spacing_= 'spacing', _speed_= 'speed', _stage_= 'stage', _steps_= 'steps',
    _stitched_travel_= 'stitched_travel', _stopped_= 'stopped', _velocity_= 'velocity',
    _wheel_step_= 'wheel_step',

    // Client events
    _dblclick_= 'dblclick'+ns, _mousedown_= 'mousedown'+ns, _mouseenter_= 'mouseenter'+ns,
    _mouseleave_= 'mouseleave'+ns, _mousemove_= 'mousemove'+ns, _mouseup_= 'mouseup'+ns,
    _mousewheel_= 'mousewheel'+ns,

    // Various string primitives
    __= '', ___= ' ', _absolute_= 'absolute', _class_= 'class', _div_= 'div', _div_tag_= tag(_div_),
    _height_= 'height', _hex_black_= '#000', _id_= 'id', _img_= 'img', _px_= 'px', _src_= 'src',
    _title_= 'title', _width_= 'width'

  // The two main graph functions chosen based on `loops` option
  function enveloping(x, start, revolution, lo, hi, cwness){
    return start + max(lo, min(hi, - x * cwness)) / revolution
  }
  function hatching(x, start, revolution, lo, hi, cwness){
    var
      x= (x < lo ? hi : 0) + x % hi, // Looping
      fraction= start + (- x * cwness) / revolution
    return fraction - floor(fraction)
  }

  // Helpers
  function tag(string){ return '<' + string + '/>' }
  function dot(string){ return '.' + string }
  function url(location){ return 'url(' + location + ')' }
  function round_to(decimals, number){ return +number.toFixed(decimals) }
  function min_max(minimum, maximum, number){ return max(minimum, min(maximum, number)) }
  function double_for(methods){ $.each(methods, pretend);
    function pretend(){ if (!$.fn[this]) $.fn[this]= function(){ return this }}
  }
  function negative_when(value, condition){ return abs(value) * (condition ? -1 : 1) }
})(jQuery, window, document);
