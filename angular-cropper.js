angular.module('tw.directives.cropper', ['tw.services.fileReader']);

angular.module('tw.directives.cropper').directive('twCropper', ['$parse', '$window', '$document', 'twFileReader', function($parse, $window, $document, twFileReader) {
  var document = $document[0],
    Math = $window.Math;

  return {
    restrict: 'A',
    controller: ['$scope', '$attrs', '$element', function($scope, $attrs, $element) {
      var canvas = $element[0];

      // If twCropper attribute is provided
      if ($attrs.twCropper) {
        // Publish this controller to the scope via the expression
        $parse($attrs.twCropper).assign($scope, this);
      }

      this.toDataURL = function toDataURL() {
        return canvas.toDataURL();
      };
    }],
    link: function(scope, el, attrs) {
      if (angular.lowercase(el[0].nodeName) !== 'canvas') {
        return;
      }

      var canvas = el[0];
      var ctx = canvas.getContext('2d');
      var img = new Image();
      var x, y, scale, maxScale, minScale;

      var draw = function draw() {
        var sx = x,
          sy = y,
          sWidth = canvas.width * scale,
          sHeight = canvas.height * scale,
          dx = 0,
          dy = 0,
          dWidth = canvas.width,
          dHeight = canvas.height;

        ctx.drawImage(img, sx, sy, sWidth, sHeight, dx, dy, dWidth, dHeight);
      };

      var zoom = function zoom(dScale) {
        var s = scale;

        scale += dScale;

        if (scale < minScale) {
          scale = minScale;
        } else if (scale > maxScale) {
          scale = maxScale;
        }

        var newWidth = scale * canvas.width;
        var newHeight = scale * canvas.height;
        var oldWidth = s * canvas.width;
        var oldHeight = s * canvas.height;

        var dWidth = newWidth - oldWidth;
        var dHeight = newHeight - oldHeight;

        x -= dWidth / 2;
        y -= dHeight / 2;

        if (x < 0) {
          x = 0;
        } else {
          if (x + newWidth > img.width) {
            x = img.width - newWidth;
          }
        }

        if (y < 0) {
          y = 0;
        } else {
          if (y + newHeight > img.height) {
            y = img.height - newHeight;
          }
        }
      };

      scope.$watch(attrs.source, function(newVal) {
        if (!newVal) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);

          return;
        }

        twFileReader.readAsDataURL(newVal).then(function(dataURL) {
          img.onload = function() {
            x = 0;
            y = 0;
            scale = minScale = 1;

            if (img.width > img.height) {
              maxScale = img.height / canvas.height;
            } else {
              maxScale = img.width / canvas.width;

            }

            if (img.height < canvas.height) {
              scale = minScale = maxScale;
            }

            if (img.width < canvas.width) {
              scale = minScale = maxScale;
            }

            draw();
          };

          img.src = dataURL;
        });
      });

      var sx, sy;
      var move = function move(newX, newY) {
        x += (sx - newX) * scale;
        y += (sy - newY) * scale;

        if (x < 0) {
          x = 0;
        } else {
          var scaledWidth = canvas.width * scale;

          if (x + scaledWidth > img.width) {
            x = img.width - scaledWidth;
          }
        }

        if (y < 0) {
          y = 0;
        } else {
          var scaledHeight = canvas.height * scale;

          if (y + scaledHeight > img.height) {
            y = img.height - scaledHeight;
          }
        }

        draw();

        sx = newX;
        sy = newY;
      };

      var mousemove = function mousemove(e) {
        move(e.clientX, e.clientY);
      };

      var d = null;
      var pinch = function pinch(touch1, touch2) {
        var x1 = touch1.clientX;
        var y1 = touch1.clientY;
        var x2 = touch2.clientX;
        var y2 = touch2.clientY;

        var newD = Math.sqrt(Math.pow(x2-x1, 2) + Math.pow(y2-y1, 2));

        if (d !== null) {
          var dx = newD - d;

          zoom(dx * -.015);

          draw();
        }

        d = newD;
      };

      var touchmove = function touchmove(e) {
        // jQuery doesn't copy touches over to its event, so we need to go through originalEvent in that case
        e = e.originalEvent || e;

        if (e.touches.length === 1) {
          move(e.touches[0].clientX, e.touches[0].clientY);
        } else if (e.touches.length === 2) {
          pinch(e.touches[0], e.touches[1]);
        }
      };

      var start = function(x, y) {
        if (!img.src) {
          return;
        }

        sx = x;
        sy = y;

        $document.on('mousemove', mousemove);
        $document.on('touchmove', touchmove);
      };

      var mousedown = function mousedown(e) {
        start(e.clientX, e.clientY);
      };

      var touchstart = function touchstart(e) {
        // jQuery doesn't copy touches over to its event, so we need to go through originalEvent in that case
        e = e.originalEvent || e;

        e.preventDefault();

        if (e.touches.length === 1) {
          start(e.touches[0].clientX, e.touches[0].clientY);
        }
      };

      el.on('mousedown', mousedown);
      el.on('touchstart', touchstart);

      var end = function end() {
        $document.off('mousemove', mousemove);
        $document.off('touchmove', touchmove);

        d = null;
      };

      $document.on('mouseup touchend', end);

      el.on('wheel', function(e) {
        e.preventDefault();

        e = e.originalEvent || e;

        if (!img.src) {
          return;
        }

        if (e.deltaY < 0) {
          zoom(-.15);
        } else {
          zoom(.15);
        }

        draw();
      });
    }
  };
}]);
