(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
(function (global){(function (){
const weaviate = require("weaviate-client");

global.onSearch = async function() {
  const searchText = document.getElementById("searchText").value;

  const articles = await searchWithWeaviate(searchText);

  displayArticles(articles);
}

const searchWithWeaviate = async (searchText) => {
  const results = await client.graphql
  .get()
  .withClassName('Article')
  .withNearText({
    concepts: [searchText],
    distance: 0.6,
  })
  .withFields('title, summary, url')
  .withLimit(6)
  .do()
  
  return results.data.Get.Article;
}

const displayArticles = (articles) => {
  const div = document.getElementById("result-div");

  let html = "";

  articles.forEach(article => {
      html += `
<div class="result-item border border-2">
  <a href="${article.url}" target="_blank" class="fw-bold">${article.title}</a>
  <p class="fw-light">${article.summary}</p>
</div>`
  });

  div.innerHTML = html;
}

const initWeaviate = () => {
  return weaviate.client({
    scheme: 'https',
    host: 'demo.dataset.playground.semi.technology',
  });
}

const client = initWeaviate();
}).call(this)}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"weaviate-client":5}],2:[function(require,module,exports){
function highlightQuery (query, errors) {
  var locations = errors.map(function (e) { return e.locations })
    .reduce(function (a, b) {
      return a.concat(b)
    }, [])

  var queryHighlight = ''

  query.split('\n').forEach(function (row, index) {
    var line = index + 1
    var lineErrors = locations.filter(function (loc) { return loc && loc.line === line })

    queryHighlight += row + '\n'

    if (lineErrors.length) {
      var errorHighlight = []

      lineErrors.forEach(function (line) {
        for (var i = 0; i < 8; i++) {
          errorHighlight[line.column + i] = '~'
        }
      })

      for (var i = 0; i < errorHighlight.length; i++) {
        queryHighlight += errorHighlight[i] || ' '
      }
      queryHighlight += '\n'
    }
  })

  return queryHighlight
}

module.exports = function (params) {
  require('isomorphic-fetch')
  if (!params.url) throw new Error('Missing url parameter')

  var headers = new Headers(params.headers)
  headers.append('Content-Type', 'application/json')

  return {
    query: function (query, variables, onResponse) {

      var req = new Request(params.url, {
        method: 'POST',
        body: JSON.stringify({
          query: query,
          variables: variables
        }),
        headers: headers,
        credentials: params.credentials
      })

      return fetch(req)
      .then(function (res) {
        onResponse && onResponse(req, res)

        return res.json()
      }).then(function (body) {
        if (body.errors && body.errors.length) {
          body.highlightQuery = highlightQuery(query, body.errors)
        }

        return body
      })
    }
  }
}

},{"isomorphic-fetch":3}],3:[function(require,module,exports){
// the whatwg-fetch polyfill installs the fetch() function
// on the global object (window or self)
//
// Return that as the export for use in Webpack, Browserify etc.
require('whatwg-fetch');
module.exports = self.fetch.bind(self);

},{"whatwg-fetch":6}],4:[function(require,module,exports){
const fetch = require("isomorphic-fetch");

const client = (config) => {
  const url = makeUrl(config.baseUri);

  return {
    post: (path, payload, expectReturnContent = true) => {
      return fetch(url(path), {
        method: "POST",
        headers: {
          ...config.headers,
          "content-type": "application/json",
        },
        body: JSON.stringify(payload),
      }).then(makeCheckStatus(expectReturnContent));
    },
    put: (path, payload, expectReturnContent = true) => {
      return fetch(url(path), {
        method: "PUT",
        headers: {
          ...config.headers,
          "content-type": "application/json",
        },
        body: JSON.stringify(payload),
      }).then(makeCheckStatus(expectReturnContent));
    },
    patch: (path, payload) => {
      return fetch(url(path), {
        method: "PATCH",
        headers: {
          ...config.headers,
          "content-type": "application/json",
        },
        body: JSON.stringify(payload),
      }).then(makeCheckStatus(false));
    },
    delete: (path, payload, expectReturnContent = false) => {
      return fetch(url(path), {
        method: "DELETE",
        headers: {
          ...config.headers,
          "content-type": "application/json",
        },
        body: payload ? JSON.stringify(payload) : undefined,
      }).then(makeCheckStatus(expectReturnContent));
    },
    head: (path, payload) => {
      return fetch(url(path), {
        method: "HEAD",
        headers: {
          ...config.headers,
          "content-type": "application/json",
        },
        body: payload ? JSON.stringify(payload) : undefined,
      }).then(handleHeadResponse(false, true));
    },
    get: (path, expectReturnContent = true) => {
      return fetch(url(path), {
        method: "GET",
        headers: {
          ...config.headers,
        },
      }).then(makeCheckStatus(expectReturnContent));
    },
    getRaw: (path) => {
      // getRaw does not handle the status leaving this to the caller
      return fetch(url(path), {
        method: "GET",
        headers: {
          ...config.headers,
        },
      });
    },
  };
};

const makeUrl = (basePath) => (path) => basePath + path;

const makeCheckStatus = (expectResponseBody) => (res) => {
  if (res.status >= 400) {
    return res.text().then(errText => {
      var err;
      try {
        // in case of invalid json response (like empty string)
        err = JSON.stringify(JSON.parse(errText))
      } catch(e) {
        err = errText
      }
      return Promise.reject(
        `usage error (${res.status}): ${err}`
      );
    });
  }

  if (expectResponseBody) {
    return res.json();
  }
};

const handleHeadResponse = (expectResponseBody) => (res) => {
  if (res.status == 204 || res.status == 404) {
    return res.status == 204
  }
  return makeCheckStatus(expectResponseBody)
}

module.exports = client;

},{"isomorphic-fetch":3}],5:[function(require,module,exports){
(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
  typeof define === 'function' && define.amd ? define(factory) :
  (global = typeof globalThis !== 'undefined' ? globalThis : global || self, global['weaviate-client'] = factory());
}(this, (function () { 'use strict';

  function _typeof(obj) {
    "@babel/helpers - typeof";

    if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") {
      _typeof = function (obj) {
        return typeof obj;
      };
    } else {
      _typeof = function (obj) {
        return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj;
      };
    }

    return _typeof(obj);
  }

  function asyncGeneratorStep(gen, resolve, reject, _next, _throw, key, arg) {
    try {
      var info = gen[key](arg);
      var value = info.value;
    } catch (error) {
      reject(error);
      return;
    }

    if (info.done) {
      resolve(value);
    } else {
      Promise.resolve(value).then(_next, _throw);
    }
  }

  function _asyncToGenerator(fn) {
    return function () {
      var self = this,
          args = arguments;
      return new Promise(function (resolve, reject) {
        var gen = fn.apply(self, args);

        function _next(value) {
          asyncGeneratorStep(gen, resolve, reject, _next, _throw, "next", value);
        }

        function _throw(err) {
          asyncGeneratorStep(gen, resolve, reject, _next, _throw, "throw", err);
        }

        _next(undefined);
      });
    };
  }

  function _classCallCheck(instance, Constructor) {
    if (!(instance instanceof Constructor)) {
      throw new TypeError("Cannot call a class as a function");
    }
  }

  function _defineProperties(target, props) {
    for (var i = 0; i < props.length; i++) {
      var descriptor = props[i];
      descriptor.enumerable = descriptor.enumerable || false;
      descriptor.configurable = true;
      if ("value" in descriptor) descriptor.writable = true;
      Object.defineProperty(target, descriptor.key, descriptor);
    }
  }

  function _createClass(Constructor, protoProps, staticProps) {
    if (protoProps) _defineProperties(Constructor.prototype, protoProps);
    if (staticProps) _defineProperties(Constructor, staticProps);
    return Constructor;
  }

  function _defineProperty(obj, key, value) {
    if (key in obj) {
      Object.defineProperty(obj, key, {
        value: value,
        enumerable: true,
        configurable: true,
        writable: true
      });
    } else {
      obj[key] = value;
    }

    return obj;
  }

  function _toConsumableArray(arr) {
    return _arrayWithoutHoles(arr) || _iterableToArray(arr) || _unsupportedIterableToArray(arr) || _nonIterableSpread();
  }

  function _arrayWithoutHoles(arr) {
    if (Array.isArray(arr)) return _arrayLikeToArray(arr);
  }

  function _iterableToArray(iter) {
    if (typeof Symbol !== "undefined" && Symbol.iterator in Object(iter)) return Array.from(iter);
  }

  function _unsupportedIterableToArray(o, minLen) {
    if (!o) return;
    if (typeof o === "string") return _arrayLikeToArray(o, minLen);
    var n = Object.prototype.toString.call(o).slice(8, -1);
    if (n === "Object" && o.constructor) n = o.constructor.name;
    if (n === "Map" || n === "Set") return Array.from(o);
    if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen);
  }

  function _arrayLikeToArray(arr, len) {
    if (len == null || len > arr.length) len = arr.length;

    for (var i = 0, arr2 = new Array(len); i < len; i++) arr2[i] = arr[i];

    return arr2;
  }

  function _nonIterableSpread() {
    throw new TypeError("Invalid attempt to spread non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.");
  }

  var GraphQLWhere = /*#__PURE__*/function () {
    function GraphQLWhere(whereObj) {
      _classCallCheck(this, GraphQLWhere);

      this.source = whereObj;
    }

    _createClass(GraphQLWhere, [{
      key: "toString",
      value: function toString() {
        this.parse();
        this.validate();

        if (this.operands) {
          return "{" + "operator:".concat(this.operator, ",") + "operands:[".concat(this.operands, "]") + "}";
        } else {
          // this is an on-value filter
          var valueContent = this.marshalValueContent();
          return "{" + "operator:".concat(this.operator, ",") + "".concat(this.valueType, ":").concat(valueContent, ",") + "path:".concat(JSON.stringify(this.path)) + "}";
        }
      }
    }, {
      key: "marshalValueContent",
      value: function marshalValueContent() {
        if (this.valueType == "valueGeoRange") {
          return this.marshalValueGeoRange();
        }

        return JSON.stringify(this.valueContent);
      }
    }, {
      key: "marshalValueGeoRange",
      value: function marshalValueGeoRange() {
        var parts = [];
        var gc = this.valueContent.geoCoordinates;

        if (gc) {
          var gcParts = [];

          if (gc.latitude) {
            gcParts = [].concat(_toConsumableArray(gcParts), ["latitude:".concat(gc.latitude)]);
          }

          if (gc.longitude) {
            gcParts = [].concat(_toConsumableArray(gcParts), ["longitude:".concat(gc.longitude)]);
          }

          parts = [].concat(_toConsumableArray(parts), ["geoCoordinates:{".concat(gcParts.join(","), "}")]);
        }

        var d = this.valueContent.distance;

        if (d) {
          var dParts = [];

          if (d.max) {
            dParts = [].concat(_toConsumableArray(dParts), ["max:".concat(d.max)]);
          }

          parts = [].concat(_toConsumableArray(parts), ["distance:{".concat(dParts.join(","), "}")]);
        }

        return "{".concat(parts.join(","), "}");
      }
    }, {
      key: "validate",
      value: function validate() {
        if (!this.operator) {
          throw new Error("where filter: operator cannot be empty");
        }

        if (!this.operands) {
          if (!this.valueType) {
            throw new Error("where filter: value<Type> cannot be empty");
          }

          if (!this.path) {
            throw new Error("where filter: path cannot be empty");
          }
        }
      }
    }, {
      key: "parse",
      value: function parse() {
        for (var key in this.source) {
          switch (key) {
            case "operator":
              this.parseOperator(this.source[key]);
              break;

            case "operands":
              this.parseOperands(this.source[key]);
              break;

            case "path":
              this.parsePath(this.source[key]);
              break;

            default:
              if (key.indexOf("value") != 0) {
                throw new Error("where filter: unrecognized key '" + key + "'");
              }

              this.parseValue(key, this.source[key]);
          }
        }
      }
    }, {
      key: "parseOperator",
      value: function parseOperator(op) {
        if (typeof op !== "string") {
          throw new Error("where filter: operator must be a string");
        }

        this.operator = op;
      }
    }, {
      key: "parsePath",
      value: function parsePath(path) {
        if (!Array.isArray(path)) {
          throw new Error("where filter: path must be an array");
        }

        this.path = path;
      }
    }, {
      key: "parseValue",
      value: function parseValue(key, value) {
        switch (key) {
          case "valueString":
          case "valueText":
          case "valueInt":
          case "valueNumber":
          case "valueDate":
          case "valueBoolean":
          case "valueGeoRange":
            break;

          default:
            throw new Error("where filter: unrecognized value prop '" + key + "'");
        }

        this.valueType = key;
        this.valueContent = value;
      }
    }, {
      key: "parseOperands",
      value: function parseOperands(ops) {
        if (!Array.isArray(ops)) {
          throw new Error("where filter: operands must be an array");
        }

        this.operands = ops.map(function (element) {
          return new GraphQLWhere(element).toString();
        }).join(",");
      }
    }]);

    return GraphQLWhere;
  }();

  var GraphQLNearText = /*#__PURE__*/function () {
    function GraphQLNearText(nearTextObj) {
      _classCallCheck(this, GraphQLNearText);

      this.source = nearTextObj;
    }

    _createClass(GraphQLNearText, [{
      key: "toString",
      value: function toString() {
        var wrap = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : true;
        this.parse();
        this.validate();
        var args = ["concepts:".concat(JSON.stringify(this.concepts))]; // concepts must always be set

        if (this.certainty) {
          args = [].concat(_toConsumableArray(args), ["certainty:".concat(this.certainty)]);
        }

        if (this.distance) {
          args = [].concat(_toConsumableArray(args), ["distance:".concat(this.distance)]);
        }

        if (this.moveTo) {
          var moveToArgs = [];

          if (this.moveToConcepts) {
            moveToArgs = [].concat(_toConsumableArray(moveToArgs), ["concepts:".concat(JSON.stringify(this.moveToConcepts))]);
          }

          if (this.moveToObjects) {
            moveToArgs = [].concat(_toConsumableArray(moveToArgs), ["objects:".concat(this.moveToObjects)]);
          }

          if (this.moveToForce) {
            moveToArgs = [].concat(_toConsumableArray(moveToArgs), ["force:".concat(this.moveToForce)]);
          }

          args = [].concat(_toConsumableArray(args), ["moveTo:{".concat(moveToArgs.join(","), "}")]);
        }

        if (this.moveAwayFrom) {
          var moveAwayFromArgs = [];

          if (this.moveAwayFromConcepts) {
            moveAwayFromArgs = [].concat(_toConsumableArray(moveAwayFromArgs), ["concepts:".concat(JSON.stringify(this.moveAwayFromConcepts))]);
          }

          if (this.moveAwayFromObjects) {
            moveAwayFromArgs = [].concat(_toConsumableArray(moveAwayFromArgs), ["objects:".concat(this.moveAwayFromObjects)]);
          }

          if (this.moveAwayFromForce) {
            moveAwayFromArgs = [].concat(_toConsumableArray(moveAwayFromArgs), ["force:".concat(this.moveAwayFromForce)]);
          }

          args = [].concat(_toConsumableArray(args), ["moveAwayFrom:{".concat(moveAwayFromArgs.join(","), "}")]);
        }

        if (this.autocorrect !== undefined) {
          args = [].concat(_toConsumableArray(args), ["autocorrect:".concat(this.autocorrect)]);
        }

        if (!wrap) {
          return "".concat(args.join(","));
        }

        return "{".concat(args.join(","), "}");
      }
    }, {
      key: "validate",
      value: function validate() {
        if (!this.concepts) {
          throw new Error("nearText filter: concepts cannot be empty");
        }

        if (this.moveTo) {
          if (!this.moveToForce || !this.moveToConcepts && !this.moveToObjects) {
            throw new Error("nearText filter: moveTo must have fields 'concepts' or 'objects' and 'force'");
          }
        }

        if (this.moveAwayFrom) {
          if (!this.moveAwayFromForce || !this.moveAwayFromConcepts && !this.moveAwayFromObjects) {
            throw new Error("nearText filter: moveAwayFrom must have fields 'concepts' or 'objects' and 'force'");
          }
        }
      }
    }, {
      key: "parse",
      value: function parse() {
        for (var key in this.source) {
          switch (key) {
            case "concepts":
              this.parseConcepts(this.source[key]);
              break;

            case "certainty":
              this.parseCertainty(this.source[key]);
              break;

            case "distance":
              this.parseDistance(this.source[key]);
              break;

            case "moveTo":
              this.parseMoveTo(this.source[key]);
              break;

            case "moveAwayFrom":
              this.parseMoveAwayFrom(this.source[key]);
              break;

            case "autocorrect":
              this.parseAutocorrect(this.source[key]);
              break;

            default:
              throw new Error("nearText filter: unrecognized key '" + key + "'");
          }
        }
      }
    }, {
      key: "parseConcepts",
      value: function parseConcepts(concepts) {
        if (!Array.isArray(concepts)) {
          throw new Error("nearText filter: concepts must be an array");
        }

        this.concepts = concepts;
      }
    }, {
      key: "parseCertainty",
      value: function parseCertainty(cert) {
        if (typeof cert !== "number") {
          throw new Error("nearText filter: certainty must be a number");
        }

        this.certainty = cert;
      }
    }, {
      key: "parseDistance",
      value: function parseDistance(dist) {
        if (typeof dist !== "number") {
          throw new Error("nearText filter: distance must be a number");
        }

        this.distance = dist;
      }
    }, {
      key: "parseMoveTo",
      value: function parseMoveTo(target) {
        if (_typeof(target) !== "object") {
          throw new Error("nearText filter: moveTo must be object");
        }

        if (!target.concepts && !target.objects) {
          throw new Error("nearText filter: moveTo.concepts or moveTo.objects must be present");
        }

        if (target.concepts && !Array.isArray(target.concepts)) {
          throw new Error("nearText filter: moveTo.concepts must be an array");
        }

        if (target.objects && !Array.isArray(target.objects)) {
          throw new Error("nearText filter: moveTo.objects must be an array");
        }

        if (target.force && typeof target.force != "number") {
          throw new Error("nearText filter: moveTo.force must be a number");
        }

        this.moveTo = true;
        this.moveToConcepts = target.concepts;
        this.moveToForce = target.force;

        if (target.objects) {
          this.moveToObjects = this.parseMoveObjects("moveTo", target.objects);
        }
      }
    }, {
      key: "parseMoveAwayFrom",
      value: function parseMoveAwayFrom(target) {
        if (_typeof(target) !== "object") {
          throw new Error("nearText filter: moveAwayFrom must be object");
        }

        if (!target.concepts && !target.objects) {
          throw new Error("nearText filter: moveAwayFrom.concepts or moveAwayFrom.objects must be present");
        }

        if (target.concepts && !Array.isArray(target.concepts)) {
          throw new Error("nearText filter: moveAwayFrom.concepts must be an array");
        }

        if (target.objects && !Array.isArray(target.objects)) {
          throw new Error("nearText filter: moveAwayFrom.objects must be an array");
        }

        if (target.force && typeof target.force != "number") {
          throw new Error("nearText filter: moveAwayFrom.force must be a number");
        }

        this.moveAwayFrom = true;
        this.moveAwayFromConcepts = target.concepts;
        this.moveAwayFromForce = target.force;

        if (target.objects) {
          this.moveAwayFromObjects = this.parseMoveObjects("moveAwayFrom", target.objects);
        }
      }
    }, {
      key: "parseAutocorrect",
      value: function parseAutocorrect(autocorrect) {
        if (typeof autocorrect !== "boolean") {
          throw new Error("nearText filter: autocorrect must be a boolean");
        }

        this.autocorrect = autocorrect;
      }
    }, {
      key: "parseMoveObjects",
      value: function parseMoveObjects(move, objects) {
        var moveObjects = [];
        var errors = [];

        for (var i in objects) {
          if (!objects[i].id && !objects[i].beacon) {
            errors.push("".concat(move, ".objects[").concat(i, "].id or ").concat(move, ".objects[").concat(i, "].beacon must be present"));
          } else if (objects[i].id && typeof objects[i].id !== "string") {
            errors.push("".concat(move, ".objects[").concat(i, "].id must be string"));
          } else if (objects[i].beacon && typeof objects[i].beacon !== "string") {
            errors.push("".concat(move, ".objects[").concat(i, "].beacon must be string"));
          } else {
            var objs = [];

            if (objects[i].id) {
              objs.push("id:\"".concat(objects[i].id, "\""));
            }

            if (objects[i].beacon) {
              objs.push("beacon:\"".concat(objects[i].beacon, "\""));
            }

            moveObjects.push("{".concat(objs.join(","), "}"));
          }
        }

        if (errors.length > 0) {
          throw new Error("nearText filter: ".concat(errors.join(", ")));
        }

        return "[".concat(moveObjects.join(","), "]");
      }
    }]);

    return GraphQLNearText;
  }();

  var GraphQLNearVector = /*#__PURE__*/function () {
    function GraphQLNearVector(nearVectorObj) {
      _classCallCheck(this, GraphQLNearVector);

      this.source = nearVectorObj;
    }

    _createClass(GraphQLNearVector, [{
      key: "toString",
      value: function toString() {
        var wrap = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : true;
        this.parse();
        this.validate();
        var args = ["vector:".concat(JSON.stringify(this.vector))]; // vector must always be set

        if (this.certainty) {
          args = [].concat(_toConsumableArray(args), ["certainty:".concat(this.certainty)]);
        }

        if (this.distance) {
          args = [].concat(_toConsumableArray(args), ["distance:".concat(this.distance)]);
        }

        if (!wrap) {
          return "".concat(args.join(","));
        }

        return "{".concat(args.join(","), "}");
      }
    }, {
      key: "validate",
      value: function validate() {
        if (!this.vector) {
          throw new Error("nearVector filter: vector cannot be empty");
        }
      }
    }, {
      key: "parse",
      value: function parse() {
        for (var key in this.source) {
          switch (key) {
            case "vector":
              this.parseVector(this.source[key]);
              break;

            case "certainty":
              this.parseCertainty(this.source[key]);
              break;

            case "distance":
              this.parseDistance(this.source[key]);
              break;

            default:
              throw new Error("nearVector filter: unrecognized key '" + key + "'");
          }
        }
      }
    }, {
      key: "parseVector",
      value: function parseVector(vector) {
        if (!Array.isArray(vector)) {
          throw new Error("nearVector filter: vector must be an array");
        }

        vector.forEach(function (elem) {
          if (typeof elem !== "number") {
            throw new Error("nearVector filter: vector elements must be a number");
          }
        });
        this.vector = vector;
      }
    }, {
      key: "parseCertainty",
      value: function parseCertainty(cert) {
        if (typeof cert !== "number") {
          throw new Error("nearVector filter: certainty must be a number");
        }

        this.certainty = cert;
      }
    }, {
      key: "parseDistance",
      value: function parseDistance(dist) {
        if (typeof dist !== "number") {
          throw new Error("nearVector filter: distance must be a number");
        }

        this.distance = dist;
      }
    }]);

    return GraphQLNearVector;
  }();

  var GraphQLNearObject = /*#__PURE__*/function () {
    function GraphQLNearObject(nearObjectObj) {
      _classCallCheck(this, GraphQLNearObject);

      this.source = nearObjectObj;
    }

    _createClass(GraphQLNearObject, [{
      key: "toString",
      value: function toString() {
        var wrap = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : true;
        this.parse();
        this.validate();
        var args = [];

        if (this.id) {
          args = [].concat(_toConsumableArray(args), ["id:".concat(JSON.stringify(this.id))]);
        }

        if (this.beacon) {
          args = [].concat(_toConsumableArray(args), ["beacon:".concat(JSON.stringify(this.beacon))]);
        }

        if (this.certainty) {
          args = [].concat(_toConsumableArray(args), ["certainty:".concat(this.certainty)]);
        }

        if (this.distance) {
          args = [].concat(_toConsumableArray(args), ["distance:".concat(this.distance)]);
        }

        if (!wrap) {
          return "".concat(args.join(","));
        }

        return "{".concat(args.join(","), "}");
      }
    }, {
      key: "validate",
      value: function validate() {
        if (!this.id && !this.beacon) {
          throw new Error("nearObject filter: id or beacon needs to be set");
        }
      }
    }, {
      key: "parse",
      value: function parse() {
        for (var key in this.source) {
          switch (key) {
            case "id":
              this.parseID(this.source[key]);
              break;

            case "beacon":
              this.parseBeacon(this.source[key]);
              break;

            case "certainty":
              this.parseCertainty(this.source[key]);
              break;

            case "distance":
              this.parseDistance(this.source[key]);
              break;

            default:
              throw new Error("nearObject filter: unrecognized key '" + key + "'");
          }
        }
      }
    }, {
      key: "parseID",
      value: function parseID(id) {
        if (typeof id !== "string") {
          throw new Error("nearObject filter: id must be a string");
        }

        this.id = id;
      }
    }, {
      key: "parseBeacon",
      value: function parseBeacon(beacon) {
        if (typeof beacon !== "string") {
          throw new Error("nearObject filter: beacon must be a string");
        }

        this.beacon = beacon;
      }
    }, {
      key: "parseCertainty",
      value: function parseCertainty(cert) {
        if (typeof cert !== "number") {
          throw new Error("nearObject filter: certainty must be a number");
        }

        this.certainty = cert;
      }
    }, {
      key: "parseDistance",
      value: function parseDistance(dist) {
        if (typeof dist !== "number") {
          throw new Error("nearObject filter: distance must be a number");
        }

        this.distance = dist;
      }
    }]);

    return GraphQLNearObject;
  }();

  function isValidIntProperty(input) {
    return Number.isInteger(input);
  }
  function isValidPositiveIntProperty(input) {
    return isValidIntProperty(input) && input >= 0;
  }

  var Aggregator = function Aggregator(client) {
    var _this = this;

    _classCallCheck(this, Aggregator);

    _defineProperty(this, "withFields", function (fields) {
      _this.fields = fields;
      return _this;
    });

    _defineProperty(this, "withClassName", function (className) {
      _this.className = className;
      return _this;
    });

    _defineProperty(this, "withWhere", function (whereObj) {
      try {
        _this.whereString = new GraphQLWhere(whereObj).toString();
      } catch (e) {
        _this.errors = [].concat(_toConsumableArray(_this.errors), [e]);
      }

      return _this;
    });

    _defineProperty(this, "withNearText", function (nearTextObj) {
      if (_this.includesNearMediaFilter) {
        throw new Error("cannot use multiple near<Media> filters in a single query");
      }

      try {
        _this.nearTextString = new GraphQLNearText(nearTextObj).toString();
        _this.includesNearMediaFilter = true;
      } catch (e) {
        _this.errors = [].concat(_toConsumableArray(_this.errors), [e]);
      }

      return _this;
    });

    _defineProperty(this, "withNearObject", function (nearObjectObj) {
      if (_this.includesNearMediaFilter) {
        throw new Error("cannot use multiple near<Media> filters in a single query");
      }

      try {
        _this.nearObjectString = new GraphQLNearObject(nearObjectObj).toString();
        _this.includesNearMediaFilter = true;
      } catch (e) {
        _this.errors = [].concat(_toConsumableArray(_this.errors), [e]);
      }

      return _this;
    });

    _defineProperty(this, "withNearVector", function (nearVectorObj) {
      if (_this.includesNearMediaFilter) {
        throw new Error("cannot use multiple near<Media> filters in a single query");
      }

      try {
        _this.nearVectorString = new GraphQLNearVector(nearVectorObj).toString();
        _this.includesNearMediaFilter = true;
      } catch (e) {
        _this.errors = [].concat(_toConsumableArray(_this.errors), [e]);
      }

      return _this;
    });

    _defineProperty(this, "withObjectLimit", function (objectLimit) {
      if (!isValidPositiveIntProperty(objectLimit)) {
        throw new Error("objectLimit must be a non-negative integer");
      }

      _this.objectLimit = objectLimit;
      return _this;
    });

    _defineProperty(this, "withLimit", function (limit) {
      _this.limit = limit;
      return _this;
    });

    _defineProperty(this, "withGroupBy", function (groupBy) {
      _this.groupBy = groupBy;
      return _this;
    });

    _defineProperty(this, "validateGroup", function () {
      if (!_this.groupBy) {
        // nothing to check if this optional parameter is not set
        return;
      }

      if (!Array.isArray(_this.groupBy)) {
        throw new Error("groupBy must be an array");
      }
    });

    _defineProperty(this, "validateIsSet", function (prop, name, setter) {
      if (prop == undefined || prop == null || prop.length == 0) {
        _this.errors = [].concat(_toConsumableArray(_this.errors), ["".concat(name, " must be set - set with ").concat(setter)]);
      }
    });

    _defineProperty(this, "validate", function () {
      _this.validateGroup();

      _this.validateIsSet(_this.className, "className", ".withClassName(className)");

      _this.validateIsSet(_this.fields, "fields", ".withFields(fields)");
    });

    _defineProperty(this, "do", function () {
      var params = "";

      _this.validate();

      if (_this.errors.length > 0) {
        return Promise.reject(new Error("invalid usage: " + _this.errors.join(", ")));
      }

      if (_this.whereString || _this.nearTextString || _this.nearObjectString || _this.nearVectorString || _this.limit || _this.groupBy) {
        var args = [];

        if (_this.whereString) {
          args = [].concat(_toConsumableArray(args), ["where:".concat(_this.whereString)]);
        }

        if (_this.nearTextString) {
          args = [].concat(_toConsumableArray(args), ["nearText:".concat(_this.nearTextString)]);
        }

        if (_this.nearObjectString) {
          args = [].concat(_toConsumableArray(args), ["nearObject:".concat(_this.nearObjectString)]);
        }

        if (_this.nearVectorString) {
          args = [].concat(_toConsumableArray(args), ["nearVector:".concat(_this.nearVectorString)]);
        }

        if (_this.groupBy) {
          args = [].concat(_toConsumableArray(args), ["groupBy:".concat(JSON.stringify(_this.groupBy))]);
        }

        if (_this.limit) {
          args = [].concat(_toConsumableArray(args), ["limit:".concat(_this.limit)]);
        }

        if (_this.objectLimit) {
          args = [].concat(_toConsumableArray(args), ["objectLimit:".concat(_this.objectLimit)]);
        }

        params = "(".concat(args.join(","), ")");
      }

      return _this.client.query("{Aggregate{".concat(_this.className).concat(params, "{").concat(_this.fields, "}}}"));
    });

    this.client = client;
    this.errors = [];
    this.includesNearMediaFilter = false;
  };
  module.exports = Aggregator;

  var GraphQLNearImage = /*#__PURE__*/function () {
    function GraphQLNearImage(nearImageObj) {
      _classCallCheck(this, GraphQLNearImage);

      this.source = nearImageObj;
    }

    _createClass(GraphQLNearImage, [{
      key: "toString",
      value: function toString() {
        var wrap = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : true;
        this.parse();
        this.validate();
        var args = [];

        if (this.image) {
          var img = this.image;

          if (img.startsWith('data:')) {
            var base64part = ';base64,';
            img = img.substring(img.indexOf(base64part) + base64part.length);
          }

          args = [].concat(_toConsumableArray(args), ["image:".concat(JSON.stringify(img))]);
        }

        if (this.certainty) {
          args = [].concat(_toConsumableArray(args), ["certainty:".concat(this.certainty)]);
        }

        if (this.distance) {
          args = [].concat(_toConsumableArray(args), ["distance:".concat(this.distance)]);
        }

        if (!wrap) {
          return "".concat(args.join(","));
        }

        return "{".concat(args.join(","), "}");
      }
    }, {
      key: "validate",
      value: function validate() {
        if (!this.image && !this.imageBlob) {
          throw new Error("nearImage filter: image or imageBlob must be present");
        }
      }
    }, {
      key: "parse",
      value: function parse() {
        for (var key in this.source) {
          switch (key) {
            case "image":
              this.parseImage(this.source[key]);
              break;

            case "certainty":
              this.parseCertainty(this.source[key]);
              break;

            case "distance":
              this.parseDistance(this.source[key]);
              break;

            default:
              throw new Error("nearImage filter: unrecognized key '" + key + "'");
          }
        }
      }
    }, {
      key: "parseImage",
      value: function parseImage(image) {
        if (typeof image !== "string") {
          throw new Error("nearImage filter: image must be a string");
        }

        this.image = image;
      }
    }, {
      key: "parseCertainty",
      value: function parseCertainty(cert) {
        if (typeof cert !== "number") {
          throw new Error("nearImage filter: certainty must be a number");
        }

        this.certainty = cert;
      }
    }, {
      key: "parseDistance",
      value: function parseDistance(dist) {
        if (typeof dist !== "number") {
          throw new Error("nearImage filter: distance must be a number");
        }

        this.distance = dist;
      }
    }]);

    return GraphQLNearImage;
  }();

  var GraphQLAsk = /*#__PURE__*/function () {
    function GraphQLAsk(askObj) {
      _classCallCheck(this, GraphQLAsk);

      this.source = askObj;
    }

    _createClass(GraphQLAsk, [{
      key: "toString",
      value: function toString() {
        var wrap = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : true;
        this.parse();
        this.validate();
        var args = [];

        if (this.question) {
          args = [].concat(_toConsumableArray(args), ["question:".concat(JSON.stringify(this.question))]);
        }

        if (this.properties) {
          args = [].concat(_toConsumableArray(args), ["properties:".concat(JSON.stringify(this.properties))]);
        }

        if (this.certainty) {
          args = [].concat(_toConsumableArray(args), ["certainty:".concat(this.certainty)]);
        }

        if (this.distance) {
          args = [].concat(_toConsumableArray(args), ["distance:".concat(this.distance)]);
        }

        if (this.autocorrect !== undefined) {
          args = [].concat(_toConsumableArray(args), ["autocorrect:".concat(this.autocorrect)]);
        }

        if (this.rerank !== undefined) {
          args = [].concat(_toConsumableArray(args), ["rerank:".concat(this.rerank)]);
        }

        if (!wrap) {
          return "".concat(args.join(","));
        }

        return "{".concat(args.join(","), "}");
      }
    }, {
      key: "validate",
      value: function validate() {
        if (!this.question) {
          throw new Error("ask filter: question needs to be set");
        }
      }
    }, {
      key: "parse",
      value: function parse() {
        for (var key in this.source) {
          switch (key) {
            case "question":
              this.parseQuestion(this.source[key]);
              break;

            case "properties":
              this.parseProperties(this.source[key]);
              break;

            case "certainty":
              this.parseCertainty(this.source[key]);
              break;

            case "distance":
              this.parseDistance(this.source[key]);
              break;

            case "autocorrect":
              this.parseAutocorrect(this.source[key]);
              break;

            case "rerank":
              this.parseRerank(this.source[key]);
              break;

            default:
              throw new Error("ask filter: unrecognized key '" + key + "'");
          }
        }
      }
    }, {
      key: "parseQuestion",
      value: function parseQuestion(question) {
        if (typeof question !== "string") {
          throw new Error("ask filter: question must be a string");
        }

        this.question = question;
      }
    }, {
      key: "parseProperties",
      value: function parseProperties(properties) {
        if (!Array.isArray(properties)) {
          throw new Error("ask filter: properties must be an array");
        }

        this.properties = properties;
      }
    }, {
      key: "parseCertainty",
      value: function parseCertainty(cert) {
        if (typeof cert !== "number") {
          throw new Error("ask filter: certainty must be a number");
        }

        this.certainty = cert;
      }
    }, {
      key: "parseDistance",
      value: function parseDistance(dist) {
        if (typeof dist !== "number") {
          throw new Error("ask filter: distance must be a number");
        }

        this.distance = dist;
      }
    }, {
      key: "parseAutocorrect",
      value: function parseAutocorrect(autocorrect) {
        if (typeof autocorrect !== "boolean") {
          throw new Error("ask filter: autocorrect must be a boolean");
        }

        this.autocorrect = autocorrect;
      }
    }, {
      key: "parseRerank",
      value: function parseRerank(rerank) {
        if (typeof rerank !== "boolean") {
          throw new Error("ask filter: rerank must be a boolean");
        }

        this.rerank = rerank;
      }
    }]);

    return GraphQLAsk;
  }();

  var GraphQLGroup = /*#__PURE__*/function () {
    function GraphQLGroup(source) {
      _classCallCheck(this, GraphQLGroup);

      this.source = source;
    }

    _createClass(GraphQLGroup, [{
      key: "toString",
      value: function toString() {
        var parts = [];

        if (this.source.type) {
          // value is a graphQL enum, so doesn't need to be quoted
          parts = [].concat(_toConsumableArray(parts), ["type:".concat(this.source.type)]);
        }

        if (this.source.force) {
          parts = [].concat(_toConsumableArray(parts), ["force:".concat(this.source.force)]);
        }

        return "{".concat(parts.join(","), "}");
      }
    }]);

    return GraphQLGroup;
  }();

  var GraphQLSort = /*#__PURE__*/function () {
    function GraphQLSort(sortObj) {
      _classCallCheck(this, GraphQLSort);

      this.source = sortObj;
      this.sortArgs = [];
      this.errors = [];
    }

    _createClass(GraphQLSort, [{
      key: "toString",
      value: function toString() {
        this.parse();
        this.validate();
        var args = [];

        if (this.sortArgs.length > 0) {
          args = [].concat(_toConsumableArray(args), [this.sortArgs]);
        } else {
          if (this.path) {
            args = [].concat(_toConsumableArray(args), ["path:".concat(JSON.stringify(this.path))]);
          }

          if (this.order) {
            args = [].concat(_toConsumableArray(args), ["order:".concat(this.order)]);
          }
        }

        if (this.sortArgs.length > 0) {
          return "".concat(args.join(","));
        }

        return "{".concat(args.join(","), "}");
      }
    }, {
      key: "validate",
      value: function validate() {
        if (this.sortArgs.length == 0) {
          this.validatePath(this.path);
        }
      }
    }, {
      key: "validatePath",
      value: function validatePath(path) {
        if (!path) {
          throw new Error("sort filter: path needs to be set");
        }

        if (path.length == 0) {
          throw new Error("sort filter: path cannot be empty");
        }
      }
    }, {
      key: "parse",
      value: function parse() {
        for (var key in this.source) {
          switch (key) {
            case "path":
              this.parsePath(this.source[key]);
              break;

            case "order":
              this.parseOrder(this.source[key]);
              break;

            default:
              try {
                this.sortArgs = [].concat(_toConsumableArray(this.sortArgs), [this.parseSortArgs(this.source[key])]);
              } catch (e) {
                this.errors = [].concat(_toConsumableArray(this.errors), ["sort argument at ".concat(key, ": ").concat(e.message)]);
              }

          }
        }

        if (this.errors.length > 0) {
          throw new Error("sort filter: ".concat(this.errors.join(", ")));
        }
      }
    }, {
      key: "parseSortArgs",
      value: function parseSortArgs(args) {
        return new GraphQLSort(args).toString();
      }
    }, {
      key: "parsePath",
      value: function parsePath(path) {
        if (!Array.isArray(path)) {
          throw new Error("sort filter: path must be an array");
        }

        this.path = path;
      }
    }, {
      key: "parseOrder",
      value: function parseOrder(order) {
        if (typeof order !== "string") {
          throw new Error("sort filter: order must be a string");
        }

        if (order !== "asc" && order !== "desc") {
          throw new Error("sort filter: order parameter not valid, possible values are: asc, desc");
        }

        this.order = order;
      }
    }]);

    return GraphQLSort;
  }();

  var Getter = function Getter(client) {
    var _this = this;

    _classCallCheck(this, Getter);

    _defineProperty(this, "withFields", function (fields) {
      _this.fields = fields;
      return _this;
    });

    _defineProperty(this, "withClassName", function (className) {
      _this.className = className;
      return _this;
    });

    _defineProperty(this, "withGroup", function (groupObj) {
      try {
        _this.groupString = new GraphQLGroup(groupObj).toString();
      } catch (e) {
        _this.errors = [].concat(_toConsumableArray(_this.errors), [e]);
      }

      return _this;
    });

    _defineProperty(this, "withWhere", function (whereObj) {
      try {
        _this.whereString = new GraphQLWhere(whereObj).toString();
      } catch (e) {
        _this.errors = [].concat(_toConsumableArray(_this.errors), [e]);
      }

      return _this;
    });

    _defineProperty(this, "withNearText", function (nearTextObj) {
      if (_this.includesNearMediaFilter) {
        throw new Error("cannot use multiple near<Media> filters in a single query");
      }

      try {
        _this.nearTextString = new GraphQLNearText(nearTextObj).toString();
        _this.includesNearMediaFilter = true;
      } catch (e) {
        _this.errors = [].concat(_toConsumableArray(_this.errors), [e]);
      }

      return _this;
    });

    _defineProperty(this, "withNearObject", function (nearObjectObj) {
      if (_this.includesNearMediaFilter) {
        throw new Error("cannot use multiple near<Media> filters in a single query");
      }

      try {
        _this.nearObjectString = new GraphQLNearObject(nearObjectObj).toString();
        _this.includesNearMediaFilter = true;
      } catch (e) {
        _this.errors = [].concat(_toConsumableArray(_this.errors), [e]);
      }

      return _this;
    });

    _defineProperty(this, "withAsk", function (askObj) {
      try {
        _this.askString = new GraphQLAsk(askObj).toString();
      } catch (e) {
        _this.errors = [].concat(_toConsumableArray(_this.errors), [e]);
      }

      return _this;
    });

    _defineProperty(this, "withNearImage", function (nearImageObj) {
      if (_this.includesNearMediaFilter) {
        throw new Error("cannot use multiple near<Media> filters in a single query");
      }

      try {
        _this.nearImageString = new GraphQLNearImage(nearImageObj).toString();
        _this.includesNearMediaFilter = true;
      } catch (e) {
        _this.errors = [].concat(_toConsumableArray(_this.errors), [e]);
      }

      return _this;
    });

    _defineProperty(this, "withNearVector", function (nearVectorObj) {
      if (_this.includesNearMediaFilter) {
        throw new Error("cannot use multiple near<Media> filters in a single query");
      }

      try {
        _this.nearVectorString = new GraphQLNearVector(nearVectorObj).toString();
        _this.includesNearMediaFilter = true;
      } catch (e) {
        _this.errors = [].concat(_toConsumableArray(_this.errors), [e]);
      }

      return _this;
    });

    _defineProperty(this, "withLimit", function (limit) {
      _this.limit = limit;
      return _this;
    });

    _defineProperty(this, "withOffset", function (offset) {
      _this.offset = offset;
      return _this;
    });

    _defineProperty(this, "withSort", function (sortObj) {
      try {
        _this.sortString = new GraphQLSort(sortObj).toString();
      } catch (e) {
        _this.errors = [].concat(_toConsumableArray(_this.errors), [e]);
      }

      return _this;
    });

    _defineProperty(this, "validateIsSet", function (prop, name, setter) {
      if (prop == undefined || prop == null || prop.length == 0) {
        _this.errors = [].concat(_toConsumableArray(_this.errors), ["".concat(name, " must be set - set with ").concat(setter)]);
      }
    });

    _defineProperty(this, "validate", function () {
      _this.validateIsSet(_this.className, "className", ".withClassName(className)");

      _this.validateIsSet(_this.fields, "fields", ".withFields(fields)");
    });

    _defineProperty(this, "do", function () {
      var params = "";

      _this.validate();

      if (_this.errors.length > 0) {
        return Promise.reject(new Error("invalid usage: " + _this.errors.join(", ")));
      }

      if (_this.whereString || _this.nearTextString || _this.nearObjectString || _this.nearVectorString || _this.askString || _this.nearImageString || _this.limit || _this.offset || _this.groupString || _this.sortString) {
        var args = [];

        if (_this.whereString) {
          args = [].concat(_toConsumableArray(args), ["where:".concat(_this.whereString)]);
        }

        if (_this.nearTextString) {
          args = [].concat(_toConsumableArray(args), ["nearText:".concat(_this.nearTextString)]);
        }

        if (_this.nearObjectString) {
          args = [].concat(_toConsumableArray(args), ["nearObject:".concat(_this.nearObjectString)]);
        }

        if (_this.askString) {
          args = [].concat(_toConsumableArray(args), ["ask:".concat(_this.askString)]);
        }

        if (_this.nearImageString) {
          args = [].concat(_toConsumableArray(args), ["nearImage:".concat(_this.nearImageString)]);
        }

        if (_this.nearVectorString) {
          args = [].concat(_toConsumableArray(args), ["nearVector:".concat(_this.nearVectorString)]);
        }

        if (_this.groupString) {
          args = [].concat(_toConsumableArray(args), ["group:".concat(_this.groupString)]);
        }

        if (_this.limit) {
          args = [].concat(_toConsumableArray(args), ["limit:".concat(_this.limit)]);
        }

        if (_this.offset) {
          args = [].concat(_toConsumableArray(args), ["offset:".concat(_this.offset)]);
        }

        if (_this.sortString) {
          args = [].concat(_toConsumableArray(args), ["sort:[".concat(_this.sortString, "]")]);
        }

        params = "(".concat(args.join(","), ")");
      }

      return _this.client.query("{Get{".concat(_this.className).concat(params, "{").concat(_this.fields, "}}}"));
    });

    this.client = client;
    this.errors = [];
    this.includesNearMediaFilter = false;
  };

  var validateKind = function validateKind(kind) {
    if (kind != KIND_THINGS && kind != KIND_ACTIONS) {
      throw new Error("invalid kind: " + kind);
    }
  };
  var KIND_THINGS = "things";
  var KIND_ACTIONS = "actions";

  var Explorer = function Explorer(client) {
    var _this = this;

    _classCallCheck(this, Explorer);

    _defineProperty(this, "withFields", function (fields) {
      _this.fields = fields;
      return _this;
    });

    _defineProperty(this, "withLimit", function (limit) {
      _this.limit = limit;
      return _this;
    });

    _defineProperty(this, "withNearText", function (nearTextObj) {
      try {
        _this.nearTextString = new GraphQLNearText(nearTextObj).toString();
      } catch (e) {
        _this.errors = [].concat(_toConsumableArray(_this.errors), [e]);
      }

      return _this;
    });

    _defineProperty(this, "withNearObject", function (nearObjectObj) {
      try {
        _this.nearObjectString = new GraphQLNearObject(nearObjectObj).toString();
      } catch (e) {
        _this.errors = [].concat(_toConsumableArray(_this.errors), [e]);
      }

      return _this;
    });

    _defineProperty(this, "withAsk", function (askObj) {
      try {
        _this.askString = new GraphQLAsk(askObj).toString();
      } catch (e) {
        _this.errors = [].concat(_toConsumableArray(_this.errors), [e]);
      }

      return _this;
    });

    _defineProperty(this, "withNearImage", function (nearImageObj) {
      try {
        _this.nearImageString = new GraphQLNearImage(nearImageObj).toString();
      } catch (e) {
        _this.errors = [].concat(_toConsumableArray(_this.errors), [e]);
      }

      return _this;
    });

    _defineProperty(this, "withNearVector", function (nearVectorObj) {
      try {
        _this.nearVectorString = new GraphQLNearVector(nearVectorObj).toString();
      } catch (e) {
        _this.errors = [].concat(_toConsumableArray(_this.errors), [e]);
      }

      return _this;
    });

    _defineProperty(this, "validateGroup", function () {
      if (!_this.group) {
        // nothing to check if this optional parameter is not set
        return;
      }

      if (!Array.isArray(_this.group)) {
        throw new Error("groupBy must be an array");
      }
    });

    _defineProperty(this, "validateIsSet", function (prop, name, setter) {
      if (prop == undefined || prop == null || prop.length == 0) {
        _this.errors = [].concat(_toConsumableArray(_this.errors), ["".concat(name, " must be set - set with ").concat(setter)]);
      }
    });

    _defineProperty(this, "validateKind", function () {
      try {
        validateKind(_this.kind);
      } catch (e) {
        _this.errors = [].concat(_toConsumableArray(_this.errors), [e.toString()]);
      }
    });

    _defineProperty(this, "validate", function () {
      _this.validateIsSet(_this.fields, "fields", ".withFields(fields)");
    });

    _defineProperty(this, "do", function () {
      var params = "";

      _this.validate();

      if (_this.errors.length > 0) {
        return Promise.reject(new Error("invalid usage: " + _this.errors.join(", ")));
      }

      var args = [];

      if (_this.nearTextString) {
        args = [].concat(_toConsumableArray(args), ["nearText:".concat(_this.nearTextString)]);
      }

      if (_this.nearObjectString) {
        args = [].concat(_toConsumableArray(args), ["nearObject:".concat(_this.nearObjectString)]);
      }

      if (_this.askString) {
        args = [].concat(_toConsumableArray(args), ["ask:".concat(_this.askString)]);
      }

      if (_this.nearImageString) {
        args = [].concat(_toConsumableArray(args), ["nearImage:".concat(_this.nearImageString)]);
      }

      if (_this.nearVectorString) {
        args = [].concat(_toConsumableArray(args), ["nearVector:".concat(_this.nearVectorString)]);
      }

      if (_this.limit) {
        args = [].concat(_toConsumableArray(args), ["limit:".concat(_this.limit)]);
      }

      params = "(".concat(args.join(","), ")");
      return _this.client.query("{Explore".concat(params, "{").concat(_this.fields, "}}"));
    });

    this.client = client;
    this.params = {};
    this.errors = [];
  };

  var graphql = function graphql(client) {
    return {
      get: function get() {
        return new Getter(client);
      },
      aggregate: function aggregate() {
        return new Aggregator(client);
      },
      explore: function explore() {
        return new Explorer(client);
      }
    };
  };

  var ClassCreator = function ClassCreator(client) {
    var _this = this;

    _classCallCheck(this, ClassCreator);

    _defineProperty(this, "withClass", function (classObj) {
      _this["class"] = classObj;
      return _this;
    });

    _defineProperty(this, "validateClass", function () {
      if (_this["class"] == undefined || _this["class"] == null) {
        _this.errors = [].concat(_toConsumableArray(_this.errors), ["class object must be set - set with .withClass(class)"]);
      }
    });

    _defineProperty(this, "do", function () {
      _this.validateClass();

      if (_this.errors.length > 0) {
        return Promise.reject(new Error("invalid usage: " + _this.errors.join(", ")));
      }

      var path = "/schema";
      return _this.client.post(path, _this["class"]);
    });

    this.client = client;
    this.errors = [];
  };

  function isValidStringProperty(input) {
    return typeof input == "string" && input.length > 0;
  }

  var ClassDeleter = function ClassDeleter(client) {
    var _this = this;

    _classCallCheck(this, ClassDeleter);

    _defineProperty(this, "withClassName", function (className) {
      _this.className = className;
      return _this;
    });

    _defineProperty(this, "validateClassName", function () {
      if (!isValidStringProperty(_this.className)) {
        _this.errors = [].concat(_toConsumableArray(_this.errors), ["className must be set - set with .withClassName(className)"]);
      }
    });

    _defineProperty(this, "validate", function () {
      _this.validateClassName();
    });

    _defineProperty(this, "do", function () {
      _this.validate();

      if (_this.errors.length > 0) {
        return Promise.reject(new Error("invalid usage: " + _this.errors.join(", ")));
      }

      var path = "/schema/".concat(_this.className);
      return _this.client["delete"](path);
    });

    this.client = client;
    this.errors = [];
  };

  var ClassGetter = function ClassGetter(client) {
    var _this = this;

    _classCallCheck(this, ClassGetter);

    _defineProperty(this, "withClassName", function (className) {
      _this.className = className;
      return _this;
    });

    _defineProperty(this, "validateClassName", function () {
      if (!isValidStringProperty(_this.className)) {
        _this.errors = [].concat(_toConsumableArray(_this.errors), ["className must be set - set with .withClassName(className)"]);
      }
    });

    _defineProperty(this, "validate", function () {
      _this.validateClassName();
    });

    _defineProperty(this, "do", function () {
      _this.validate();

      if (_this.errors.length > 0) {
        return Promise.reject(new Error("invalid usage: " + _this.errors.join(", ")));
      }

      var path = "/schema/".concat(_this.className);
      return _this.client.get(path);
    });

    this.client = client;
    this.errors = [];
  };

  var PropertyCreator = function PropertyCreator(client) {
    var _this = this;

    _classCallCheck(this, PropertyCreator);

    _defineProperty(this, "withClassName", function (className) {
      _this.className = className;
      return _this;
    });

    _defineProperty(this, "withProperty", function (property) {
      _this.property = property;
      return _this;
    });

    _defineProperty(this, "validateClassName", function () {
      if (!isValidStringProperty(_this.className)) {
        _this.errors = [].concat(_toConsumableArray(_this.errors), ["className must be set - set with .withClassName(className)"]);
      }
    });

    _defineProperty(this, "validateProperty", function () {
      if (_this.property == undefined || _this.property == null) {
        _this.errors = [].concat(_toConsumableArray(_this.errors), ["property must be set - set with .withProperty(property)"]);
      }
    });

    _defineProperty(this, "validate", function () {
      _this.validateClassName();

      _this.validateProperty();
    });

    _defineProperty(this, "do", function () {
      _this.validate();

      if (_this.errors.length > 0) {
        return Promise.reject(new Error("invalid usage: " + _this.errors.join(", ")));
      }

      var path = "/schema/".concat(_this.className, "/properties");
      return _this.client.post(path, _this.property);
    });

    this.client = client;
    this.errors = [];
  };

  var Getter$1 = function Getter(client) {
    var _this = this;

    _classCallCheck(this, Getter);

    _defineProperty(this, "do", function () {
      if (_this.errors.length > 0) {
        return Promise.reject(new Error("invalid usage: " + _this.errors.join(", ")));
      }

      var path = "/schema";
      return _this.client.get(path);
    });

    this.client = client;
    this.errors = [];
  };

  var ShardsGetter = function ShardsGetter(client) {
    var _this = this;

    _classCallCheck(this, ShardsGetter);

    _defineProperty(this, "withClassName", function (className) {
      _this.className = className;
      return _this;
    });

    _defineProperty(this, "validateClassName", function () {
      if (!isValidStringProperty(_this.className)) {
        _this.errors = [].concat(_toConsumableArray(_this.errors), ["className must be set - set with .withClassName(className)"]);
      }
    });

    _defineProperty(this, "validate", function () {
      _this.validateClassName();
    });

    _defineProperty(this, "do", function () {
      _this.validate();

      if (_this.errors.length > 0) {
        return Promise.reject(new Error("invalid usage: ".concat(_this.errors.join(", "))));
      }

      return getShards(_this.client, _this.className);
    });

    this.client = client;
    this.errors = [];
  };
  function getShards(client, className) {
    var path = "/schema/".concat(className, "/shards");
    return client.get(path);
  }

  var ShardUpdater = function ShardUpdater(client) {
    var _this = this;

    _classCallCheck(this, ShardUpdater);

    _defineProperty(this, "withClassName", function (className) {
      _this.className = className;
      return _this;
    });

    _defineProperty(this, "validateClassName", function () {
      if (!isValidStringProperty(_this.className)) {
        _this.errors = [].concat(_toConsumableArray(_this.errors), ["className must be set - set with .withClassName(className)"]);
      }
    });

    _defineProperty(this, "withShardName", function (shardName) {
      _this.shardName = shardName;
      return _this;
    });

    _defineProperty(this, "validateShardName", function () {
      if (!isValidStringProperty(_this.shardName)) {
        _this.errors = [].concat(_toConsumableArray(_this.errors), ["shardName must be set - set with .withShardName(shardName)"]);
      }
    });

    _defineProperty(this, "withStatus", function (status) {
      _this.status = status;
      return _this;
    });

    _defineProperty(this, "validateStatus", function () {
      if (!isValidStringProperty(_this.status)) {
        _this.errors = [].concat(_toConsumableArray(_this.errors), ["status must be set - set with .withStatus(status)"]);
      }
    });

    _defineProperty(this, "validate", function () {
      _this.validateClassName();

      _this.validateShardName();

      _this.validateStatus();
    });

    _defineProperty(this, "do", function () {
      _this.validate();

      if (_this.errors.length > 0) {
        return Promise.reject(new Error("invalid usage: ".concat(_this.errors.join(", "))));
      }

      return updateShard(_this.client, _this.className, _this.shardName, _this.status);
    });

    this.client = client;
    this.errors = [];
  };
  function updateShard(client, className, shardName, status) {
    var path = "/schema/".concat(className, "/shards/").concat(shardName);
    return client.put(path, {
      status: status
    }, true);
  }

  var ShardsUpdater = function ShardsUpdater(client) {
    var _this = this;

    _classCallCheck(this, ShardsUpdater);

    _defineProperty(this, "withClassName", function (className) {
      _this.className = className;
      return _this;
    });

    _defineProperty(this, "validateClassName", function () {
      if (!isValidStringProperty(_this.className)) {
        _this.errors = [].concat(_toConsumableArray(_this.errors), ["className must be set - set with .withClassName(className)"]);
      }
    });

    _defineProperty(this, "withStatus", function (status) {
      _this.status = status;
      return _this;
    });

    _defineProperty(this, "validateStatus", function () {
      if (!isValidStringProperty(_this.status)) {
        _this.errors = [].concat(_toConsumableArray(_this.errors), ["status must be set - set with .withStatus(status)"]);
      }
    });

    _defineProperty(this, "validate", function () {
      _this.validateClassName();

      _this.validateStatus();
    });

    _defineProperty(this, "updateShards", /*#__PURE__*/_asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee() {
      var payload, _loop, i;

      return regeneratorRuntime.wrap(function _callee$(_context2) {
        while (1) {
          switch (_context2.prev = _context2.next) {
            case 0:
              payload = [];
              _loop = /*#__PURE__*/regeneratorRuntime.mark(function _loop(i) {
                return regeneratorRuntime.wrap(function _loop$(_context) {
                  while (1) {
                    switch (_context.prev = _context.next) {
                      case 0:
                        _context.next = 2;
                        return updateShard(_this.client, _this.className, _this.shards[i].name, _this.status).then(function (res) {
                          payload.push({
                            name: _this.shards[i].name,
                            status: res.status
                          });
                        })["catch"](function (err) {
                          return _this.errors = [].concat(_toConsumableArray(_this.errors), [err]);
                        });

                      case 2:
                      case "end":
                        return _context.stop();
                    }
                  }
                }, _loop);
              });
              i = 0;

            case 3:
              if (!(i < _this.shards.length)) {
                _context2.next = 8;
                break;
              }

              return _context2.delegateYield(_loop(i), "t0", 5);

            case 5:
              i++;
              _context2.next = 3;
              break;

            case 8:
              if (!(_this.errors.length > 0)) {
                _context2.next = 10;
                break;
              }

              return _context2.abrupt("return", Promise.reject(new Error("failed to update shards: ".concat(_this.errors.join(", ")))));

            case 10:
              return _context2.abrupt("return", Promise.resolve(payload));

            case 11:
            case "end":
              return _context2.stop();
          }
        }
      }, _callee);
    })));

    _defineProperty(this, "do", function () {
      _this.validate();

      if (_this.errors.length > 0) {
        return Promise.reject(new Error("invalid usage: ".concat(_this.errors.join(", "))));
      }

      return getShards(_this.client, _this.className).then(function (shards) {
        return _this.shards = shards;
      }).then(_this.updateShards).then(function (payload) {
        return payload;
      })["catch"](function (err) {
        return Promise.reject(err);
      });
    });

    this.client = client;
    this.errors = [];
    this.shards = [];
  };

  var schema = function schema(client) {
    return {
      classCreator: function classCreator() {
        return new ClassCreator(client);
      },
      classDeleter: function classDeleter() {
        return new ClassDeleter(client);
      },
      classGetter: function classGetter() {
        return new ClassGetter(client);
      },
      getter: function getter() {
        return new Getter$1(client);
      },
      propertyCreator: function propertyCreator() {
        return new PropertyCreator(client);
      },
      shardsGetter: function shardsGetter() {
        return new ShardsGetter(client);
      },
      shardUpdater: function shardUpdater() {
        return new ShardUpdater(client);
      },
      shardsUpdater: function shardsUpdater() {
        return new ShardsUpdater(client);
      }
    };
  };

  var Creator = function Creator(client, objectsPath) {
    var _this = this;

    _classCallCheck(this, Creator);

    _defineProperty(this, "withVector", function (vector) {
      _this.vector = vector;
      return _this;
    });

    _defineProperty(this, "withClassName", function (className) {
      _this.className = className;
      return _this;
    });

    _defineProperty(this, "withProperties", function (properties) {
      _this.properties = properties;
      return _this;
    });

    _defineProperty(this, "withId", function (id) {
      _this.id = id;
      return _this;
    });

    _defineProperty(this, "validateClassName", function () {
      if (!isValidStringProperty(_this.className)) {
        _this.errors = [].concat(_toConsumableArray(_this.errors), ["className must be set - set with .withClassName(className)"]);
      }
    });

    _defineProperty(this, "payload", function () {
      return {
        vector: _this.vector,
        properties: _this.properties,
        "class": _this.className,
        id: _this.id
      };
    });

    _defineProperty(this, "validate", function () {
      _this.validateClassName();
    });

    _defineProperty(this, "do", function () {
      _this.validate();

      if (_this.errors.length > 0) {
        return Promise.reject(new Error("invalid usage: " + _this.errors.join(", ")));
      }

      return _this.objectsPath.buildCreate().then(function (path) {
        return _this.client.post(path, _this.payload());
      });
    });

    this.client = client;
    this.objectsPath = objectsPath;
    this.errors = [];
  };

  var Validator = function Validator(client) {
    var _this = this;

    _classCallCheck(this, Validator);

    _defineProperty(this, "withClassName", function (className) {
      _this.className = className;
      return _this;
    });

    _defineProperty(this, "withProperties", function (properties) {
      _this.properties = properties;
      return _this;
    });

    _defineProperty(this, "withId", function (id) {
      _this.id = id;
      return _this;
    });

    _defineProperty(this, "validateClassName", function () {
      if (!isValidStringProperty(_this.className)) {
        _this.errors = [].concat(_toConsumableArray(_this.errors), ["className must be set - set with .withClassName(className)"]);
      }
    });

    _defineProperty(this, "payload", function () {
      return {
        properties: _this.properties,
        "class": _this.className,
        id: _this.id
      };
    });

    _defineProperty(this, "validate", function () {
      _this.validateClassName();
    });

    _defineProperty(this, "do", function () {
      _this.validate();

      if (_this.errors.length > 0) {
        return Promise.reject(new Error("invalid usage: " + _this.errors.join(", ")));
      }

      var path = "/objects/validate";
      return _this.client.post(path, _this.payload(), false).then(function () {
        return true;
      });
    });

    this.client = client;
    this.errors = [];
  };

  var Updater = function Updater(client, objectsPath) {
    var _this = this;

    _classCallCheck(this, Updater);

    _defineProperty(this, "withProperties", function (properties) {
      _this.properties = properties;
      return _this;
    });

    _defineProperty(this, "withId", function (id) {
      _this.id = id;
      return _this;
    });

    _defineProperty(this, "withClassName", function (className) {
      _this.className = className;
      return _this;
    });

    _defineProperty(this, "validateClassName", function () {
      if (!isValidStringProperty(_this.className)) {
        _this.errors = [].concat(_toConsumableArray(_this.errors), ["className must be set - use withClassName(className)"]);
      }
    });

    _defineProperty(this, "validateId", function () {
      if (_this.id == undefined || _this.id == null || _this.id.length == 0) {
        _this.errors = [].concat(_toConsumableArray(_this.errors), ["id must be set - initialize with updater(id)"]);
      }
    });

    _defineProperty(this, "payload", function () {
      return {
        properties: _this.properties,
        "class": _this.className,
        id: _this.id
      };
    });

    _defineProperty(this, "validate", function () {
      _this.validateClassName();

      _this.validateId();
    });

    _defineProperty(this, "do", function () {
      _this.validate();

      if (_this.errors.length > 0) {
        return Promise.reject(new Error("invalid usage: " + _this.errors.join(", ")));
      }

      return _this.objectsPath.buildUpdate(_this.id, _this.className).then(function (path) {
        return _this.client.put(path, _this.payload());
      });
    });

    this.client = client;
    this.objectsPath = objectsPath;
    this.errors = [];
  };

  var Merger = function Merger(client, objectsPath) {
    var _this = this;

    _classCallCheck(this, Merger);

    _defineProperty(this, "withProperties", function (properties) {
      _this.properties = properties;
      return _this;
    });

    _defineProperty(this, "withClassName", function (className) {
      _this.className = className;
      return _this;
    });

    _defineProperty(this, "withId", function (id) {
      _this.id = id;
      return _this;
    });

    _defineProperty(this, "validateClassName", function () {
      if (!isValidStringProperty(_this.className)) {
        _this.errors = [].concat(_toConsumableArray(_this.errors), ["className must be set - set with withClassName(className)"]);
      }
    });

    _defineProperty(this, "validateId", function () {
      if (_this.id == undefined || _this.id == null || _this.id.length == 0) {
        _this.errors = [].concat(_toConsumableArray(_this.errors), ["id must be set - set with withId(id)"]);
      }
    });

    _defineProperty(this, "payload", function () {
      return {
        properties: _this.properties,
        "class": _this.className,
        id: _this.id
      };
    });

    _defineProperty(this, "validate", function () {
      _this.validateClassName();

      _this.validateId();
    });

    _defineProperty(this, "do", function () {
      _this.validate();

      if (_this.errors.length > 0) {
        return Promise.reject(new Error("invalid usage: " + _this.errors.join(", ")));
      }

      return _this.objectsPath.buildMerge(_this.id, _this.className).then(function (path) {
        return _this.client.patch(path, _this.payload());
      });
    });

    this.client = client;
    this.objectsPath = objectsPath;
    this.errors = [];
  };

  var Getter$2 = function Getter(client, objectsPath) {
    var _this = this;

    _classCallCheck(this, Getter);

    _defineProperty(this, "withClassName", function (className) {
      _this.className = className;
      return _this;
    });

    _defineProperty(this, "withLimit", function (limit) {
      _this.limit = limit;
      return _this;
    });

    _defineProperty(this, "extendAdditionals", function (prop) {
      _this.additionals = [].concat(_toConsumableArray(_this.additionals), [prop]);
      return _this;
    });

    _defineProperty(this, "withAdditional", function (additionalFlag) {
      return _this.extendAdditionals(additionalFlag);
    });

    _defineProperty(this, "withVector", function () {
      return _this.extendAdditionals("vector");
    });

    _defineProperty(this, "do", function () {
      if (_this.errors.length > 0) {
        return Promise.reject(new Error("invalid usage: " + _this.errors.join(", ")));
      }

      return _this.objectsPath.buildGet(_this.className, _this.limit, _this.additionals).then(_this.client.get);
    });

    this.client = client;
    this.objectsPath = objectsPath;
    this.errors = [];
    this.additionals = [];
  };

  var GetterById = function GetterById(client, objectsPath) {
    var _this = this;

    _classCallCheck(this, GetterById);

    _defineProperty(this, "withId", function (id) {
      _this.id = id;
      return _this;
    });

    _defineProperty(this, "withClassName", function (className) {
      _this.className = className;
      return _this;
    });

    _defineProperty(this, "extendAdditionals", function (prop) {
      _this.additionals = [].concat(_toConsumableArray(_this.additionals), [prop]);
      return _this;
    });

    _defineProperty(this, "withAdditional", function (additionalFlag) {
      return _this.extendAdditionals(additionalFlag);
    });

    _defineProperty(this, "withVector", function () {
      return _this.extendAdditionals("vector");
    });

    _defineProperty(this, "validateId", function () {
      if (_this.id == undefined || _this.id == null || _this.id.length == 0) {
        _this.errors = [].concat(_toConsumableArray(_this.errors), ["id must be set - initialize with getterById(id)"]);
      }
    });

    _defineProperty(this, "validate", function () {
      _this.validateId();
    });

    _defineProperty(this, "do", function () {
      _this.validate();

      if (_this.errors.length > 0) {
        return Promise.reject(new Error("invalid usage: " + _this.errors.join(", ")));
      }

      return _this.objectsPath.buildGetOne(_this.id, _this.className, _this.additionals).then(_this.client.get);
    });

    this.client = client;
    this.objectsPath = objectsPath;
    this.errors = [];
    this.additionals = [];
  };

  var Deleter = function Deleter(client, objectsPath) {
    var _this = this;

    _classCallCheck(this, Deleter);

    _defineProperty(this, "withId", function (id) {
      _this.id = id;
      return _this;
    });

    _defineProperty(this, "withClassName", function (className) {
      _this.className = className;
      return _this;
    });

    _defineProperty(this, "validateIsSet", function (prop, name, setter) {
      if (prop == undefined || prop == null || prop.length == 0) {
        _this.errors = [].concat(_toConsumableArray(_this.errors), ["".concat(name, " must be set - set with ").concat(setter)]);
      }
    });

    _defineProperty(this, "validateId", function () {
      _this.validateIsSet(_this.id, "id", ".withId(id)");
    });

    _defineProperty(this, "validate", function () {
      _this.validateId();
    });

    _defineProperty(this, "do", function () {
      if (_this.errors.length > 0) {
        return Promise.reject(new Error("invalid usage: " + _this.errors.join(", ")));
      }

      _this.validate();

      return _this.objectsPath.buildDelete(_this.id, _this.className).then(_this.client["delete"]);
    });

    this.client = client;
    this.objectsPath = objectsPath;
    this.errors = [];
  };

  var Checker = function Checker(client, objectsPath) {
    var _this = this;

    _classCallCheck(this, Checker);

    _defineProperty(this, "withId", function (id) {
      _this.id = id;
      return _this;
    });

    _defineProperty(this, "withClassName", function (className) {
      _this.className = className;
      return _this;
    });

    _defineProperty(this, "validateIsSet", function (prop, name, setter) {
      if (prop == undefined || prop == null || prop.length == 0) {
        _this.errors = [].concat(_toConsumableArray(_this.errors), ["".concat(name, " must be set - set with ").concat(setter)]);
      }
    });

    _defineProperty(this, "validateId", function () {
      _this.validateIsSet(_this.id, "id", ".withId(id)");
    });

    _defineProperty(this, "validate", function () {
      _this.validateId();
    });

    _defineProperty(this, "do", function () {
      if (_this.errors.length > 0) {
        return Promise.reject(new Error("invalid usage: " + _this.errors.join(", ")));
      }

      _this.validate();

      return _this.objectsPath.buildCheck(_this.id, _this.className).then(_this.client.head);
    });

    this.client = client;
    this.objectsPath = objectsPath;
    this.errors = [];
  };

  var ReferenceCreator = /*#__PURE__*/function () {
    function ReferenceCreator(client, referencesPath, beaconPath) {
      var _this = this;

      _classCallCheck(this, ReferenceCreator);

      _defineProperty(this, "withId", function (id) {
        _this.id = id;
        return _this;
      });

      _defineProperty(this, "withReference", function (ref) {
        _this.reference = ref;
        return _this;
      });

      _defineProperty(this, "withReferenceProperty", function (refProp) {
        _this.refProp = refProp;
        return _this;
      });

      _defineProperty(this, "validateIsSet", function (prop, name, setter) {
        if (prop == undefined || prop == null || prop.length == 0) {
          _this.errors = [].concat(_toConsumableArray(_this.errors), ["".concat(name, " must be set - set with ").concat(setter)]);
        }
      });

      _defineProperty(this, "validate", function () {
        _this.validateIsSet(_this.id, "id", ".withId(id)");

        _this.validateIsSet(_this.reference, "reference", ".withReference(ref)");

        _this.validateIsSet(_this.refProp, "referenceProperty", ".withReferenceProperty(refProp)");
      });

      _defineProperty(this, "payload", function () {
        return _this.reference;
      });

      _defineProperty(this, "do", function () {
        _this.validate();

        if (_this.errors.length > 0) {
          return Promise.reject(new Error("invalid usage: " + _this.errors.join(", ")));
        }

        return Promise.all([_this.referencesPath.build(_this.id, _this.className, _this.refProp), _this.beaconPath.rebuild(_this.reference.beacon)]).then(function (results) {
          var path = results[0];
          var beacon = results[1];
          return _this.client.post(path, {
            beacon: beacon
          }, false);
        });
      });

      this.client = client;
      this.referencesPath = referencesPath;
      this.beaconPath = beaconPath;
      this.errors = [];
    }

    _createClass(ReferenceCreator, [{
      key: "withClassName",
      value: function withClassName(className) {
        this.className = className;
        return this;
      }
    }]);

    return ReferenceCreator;
  }();

  var ReferenceReplacer = /*#__PURE__*/function () {
    function ReferenceReplacer(client, referencesPath, beaconPath) {
      var _this = this;

      _classCallCheck(this, ReferenceReplacer);

      _defineProperty(this, "withId", function (id) {
        _this.id = id;
        return _this;
      });

      _defineProperty(this, "withReferences", function (refs) {
        _this.references = refs;
        return _this;
      });

      _defineProperty(this, "withReferenceProperty", function (refProp) {
        _this.refProp = refProp;
        return _this;
      });

      _defineProperty(this, "validateIsSet", function (prop, name, setter) {
        if (prop == undefined || prop == null || prop.length == 0) {
          _this.errors = [].concat(_toConsumableArray(_this.errors), ["".concat(name, " must be set - set with ").concat(setter)]);
        }
      });

      _defineProperty(this, "validate", function () {
        _this.validateIsSet(_this.id, "id", ".withId(id)");

        _this.validateIsSet(_this.refProp, "referenceProperty", ".withReferenceProperty(refProp)");
      });

      _defineProperty(this, "payload", function () {
        return _this.references;
      });

      _defineProperty(this, "do", function () {
        _this.validate();

        if (_this.errors.length > 0) {
          return Promise.reject(new Error("invalid usage: " + _this.errors.join(", ")));
        }

        var payloadPromise = Array.isArray(_this.references) ? Promise.all(_this.references.map(function (ref) {
          return _this.rebuildReferencePromise(ref);
        })) : Promise.resolve([]);
        return Promise.all([_this.referencesPath.build(_this.id, _this.className, _this.refProp), payloadPromise]).then(function (results) {
          var path = results[0];
          var payload = results[1];
          return _this.client.put(path, payload, false);
        });
      });

      this.client = client;
      this.referencesPath = referencesPath;
      this.beaconPath = beaconPath;
      this.errors = [];
    }

    _createClass(ReferenceReplacer, [{
      key: "withClassName",
      value: function withClassName(className) {
        this.className = className;
        return this;
      }
    }, {
      key: "rebuildReferencePromise",
      value: function rebuildReferencePromise(reference) {
        return this.beaconPath.rebuild(reference.beacon).then(function (beacon) {
          return {
            beacon: beacon
          };
        });
      }
    }]);

    return ReferenceReplacer;
  }();

  var ReferenceDeleter = /*#__PURE__*/function () {
    function ReferenceDeleter(client, referencesPath, beaconPath) {
      var _this = this;

      _classCallCheck(this, ReferenceDeleter);

      _defineProperty(this, "withId", function (id) {
        _this.id = id;
        return _this;
      });

      _defineProperty(this, "withReference", function (ref) {
        _this.reference = ref;
        return _this;
      });

      _defineProperty(this, "withReferenceProperty", function (refProp) {
        _this.refProp = refProp;
        return _this;
      });

      _defineProperty(this, "validateIsSet", function (prop, name, setter) {
        if (prop == undefined || prop == null || prop.length == 0) {
          _this.errors = [].concat(_toConsumableArray(_this.errors), ["".concat(name, " must be set - set with ").concat(setter)]);
        }
      });

      _defineProperty(this, "validate", function () {
        _this.validateIsSet(_this.id, "id", ".withId(id)");

        _this.validateIsSet(_this.reference, "reference", ".withReference(ref)");

        _this.validateIsSet(_this.refProp, "referenceProperty", ".withReferenceProperty(refProp)");
      });

      _defineProperty(this, "payload", function () {
        return _this.reference;
      });

      _defineProperty(this, "do", function () {
        _this.validate();

        if (_this.errors.length > 0) {
          return Promise.reject(new Error("invalid usage: " + _this.errors.join(", ")));
        }

        return Promise.all([_this.referencesPath.build(_this.id, _this.className, _this.refProp), _this.beaconPath.rebuild(_this.reference.beacon)]).then(function (results) {
          var path = results[0];
          var beacon = results[1];
          return _this.client["delete"](path, {
            beacon: beacon
          }, false);
        });
      });

      this.client = client;
      this.referencesPath = referencesPath;
      this.beaconPath = beaconPath;
      this.errors = [];
    }

    _createClass(ReferenceDeleter, [{
      key: "withClassName",
      value: function withClassName(className) {
        this.className = className;
        return this;
      }
    }]);

    return ReferenceDeleter;
  }();

  var ReferencePayloadBuilder = /*#__PURE__*/function () {
    function ReferencePayloadBuilder(client) {
      var _this = this;

      _classCallCheck(this, ReferencePayloadBuilder);

      _defineProperty(this, "withId", function (id) {
        _this.id = id;
        return _this;
      });

      _defineProperty(this, "validateIsSet", function (prop, name, setter) {
        if (prop == undefined || prop == null || prop.length == 0) {
          _this.errors = [].concat(_toConsumableArray(_this.errors), ["".concat(name, " must be set - set with ").concat(setter)]);
        }
      });

      _defineProperty(this, "validate", function () {
        _this.validateIsSet(_this.id, "id", ".withId(id)");
      });

      _defineProperty(this, "payload", function () {
        _this.validate();

        if (_this.errors.length > 0) {
          throw new Error(_this.errors.join(", "));
        }

        var beacon = "weaviate://localhost";

        if (isValidStringProperty(_this.className)) {
          beacon = "".concat(beacon, "/").concat(_this.className);
        }

        return {
          beacon: "".concat(beacon, "/").concat(_this.id)
        };
      });

      this.client = client;
      this.errors = [];
    }

    _createClass(ReferencePayloadBuilder, [{
      key: "withClassName",
      value: function withClassName(className) {
        this.className = className;
        return this;
      }
    }]);

    return ReferencePayloadBuilder;
  }();

  var objectsPathPrefix = "/objects";
  var ObjectsPath = /*#__PURE__*/function () {
    function ObjectsPath(dbVersionSupport) {
      _classCallCheck(this, ObjectsPath);

      this.dbVersionSupport = dbVersionSupport;
    }

    _createClass(ObjectsPath, [{
      key: "buildCreate",
      value: function buildCreate() {
        return this.build({}, []);
      }
    }, {
      key: "buildDelete",
      value: function buildDelete(id, className) {
        return this.build({
          id: id,
          className: className
        }, [this.addClassNameDeprecatedNotSupportedCheck, this.addId]);
      }
    }, {
      key: "buildCheck",
      value: function buildCheck(id, className) {
        return this.build({
          id: id,
          className: className
        }, [this.addClassNameDeprecatedNotSupportedCheck, this.addId]);
      }
    }, {
      key: "buildGetOne",
      value: function buildGetOne(id, className, additionals) {
        return this.build({
          id: id,
          className: className,
          additionals: additionals
        }, [this.addClassNameDeprecatedNotSupportedCheck, this.addId, this.addQueryParams]);
      }
    }, {
      key: "buildGet",
      value: function buildGet(className, limit, additionals) {
        return this.build({
          className: className,
          limit: limit,
          additionals: additionals
        }, [this.addQueryParamsForGet]);
      }
    }, {
      key: "buildUpdate",
      value: function buildUpdate(id, className) {
        return this.build({
          id: id,
          className: className
        }, [this.addClassNameDeprecatedCheck, this.addId]);
      }
    }, {
      key: "buildMerge",
      value: function buildMerge(id, className) {
        return this.build({
          id: id,
          className: className
        }, [this.addClassNameDeprecatedCheck, this.addId]);
      }
    }, {
      key: "build",
      value: function build(params, modifiers) {
        return this.dbVersionSupport.supportsClassNameNamespacedEndpointsPromise().then(function (support) {
          var path = objectsPathPrefix;
          modifiers.forEach(function (modifier) {
            path = modifier(params, path, support);
          });
          return path;
        });
      }
    }, {
      key: "addClassNameDeprecatedNotSupportedCheck",
      value: function addClassNameDeprecatedNotSupportedCheck(params, path, support) {
        if (support.supports) {
          if (isValidStringProperty(params.className)) {
            return "".concat(path, "/").concat(params.className);
          } else {
            support.warns.deprecatedNonClassNameNamespacedEndpointsForObjects();
          }
        } else {
          support.warns.notSupportedClassNamespacedEndpointsForObjects();
        }

        return path;
      }
    }, {
      key: "addClassNameDeprecatedCheck",
      value: function addClassNameDeprecatedCheck(params, path, support) {
        if (support.supports) {
          if (isValidStringProperty(params.className)) {
            return "".concat(path, "/").concat(params.className);
          } else {
            support.warns.deprecatedNonClassNameNamespacedEndpointsForObjects();
          }
        }

        return path;
      }
    }, {
      key: "addId",
      value: function addId(params, path) {
        if (isValidStringProperty(params.id)) {
          return "".concat(path, "/").concat(params.id);
        }

        return path;
      }
    }, {
      key: "addQueryParams",
      value: function addQueryParams(params, path) {
        var queryParams = [];

        if (Array.isArray(params.additionals) && params.additionals.length > 0) {
          queryParams.push("include=".concat(params.additionals.join(",")));
        }

        if (queryParams.length > 0) {
          return "".concat(path, "?").concat(queryParams.join("&"));
        }

        return path;
      }
    }, {
      key: "addQueryParamsForGet",
      value: function addQueryParamsForGet(params, path, support) {
        var queryParams = [];

        if (Array.isArray(params.additionals) && params.additionals.length > 0) {
          queryParams.push("include=".concat(params.additionals.join(",")));
        }

        if (typeof params.limit == "number" && params.limit > 0) {
          queryParams.push("limit=".concat(params.limit));
        }

        if (isValidStringProperty(params.className)) {
          if (support.supports) {
            queryParams.push("class=".concat(params.className));
          } else {
            support.warns.notSupportedClassParameterInEndpointsForObjects();
          }
        }

        if (queryParams.length > 0) {
          return "".concat(path, "?").concat(queryParams.join("&"));
        }

        return path;
      }
    }]);

    return ObjectsPath;
  }();
  var ReferencesPath = /*#__PURE__*/function () {
    function ReferencesPath(dbVersionSupport) {
      _classCallCheck(this, ReferencesPath);

      this.dbVersionSupport = dbVersionSupport;
    }

    _createClass(ReferencesPath, [{
      key: "build",
      value: function build(id, className, property) {
        return this.dbVersionSupport.supportsClassNameNamespacedEndpointsPromise().then(function (support) {
          var path = objectsPathPrefix;

          if (support.supports) {
            if (isValidStringProperty(className)) {
              path = "".concat(path, "/").concat(className);
            } else {
              support.warns.deprecatedNonClassNameNamespacedEndpointsForReferences();
            }
          } else {
            support.warns.notSupportedClassNamespacedEndpointsForReferences();
          }

          if (isValidStringProperty(id)) {
            path = "".concat(path, "/").concat(id);
          }

          path = "".concat(path, "/references");

          if (isValidStringProperty(property)) {
            path = "".concat(path, "/").concat(property);
          }

          return path;
        });
      }
    }]);

    return ReferencesPath;
  }();

  var beaconPathPrefix = "weaviate://localhost";
  var BeaconPath = /*#__PURE__*/function () {
    function BeaconPath(dbVersionSupport) {
      _classCallCheck(this, BeaconPath);

      this.dbVersionSupport = dbVersionSupport; // matches
      // weaviate://localhost/class/id    => match[2] = class, match[4] = id
      // weaviate://localhost/class/id/   => match[2] = class, match[4] = id
      // weaviate://localhost/id          => match[2] = id, match[4] = undefined
      // weaviate://localhost/id/         => match[2] = id, match[4] = undefined

      this.beaconRegExp = /^weaviate:\/\/localhost(\/([^\/]+))?(\/([^\/]+))?[\/]?$/ig;
    }

    _createClass(BeaconPath, [{
      key: "rebuild",
      value: function rebuild(beacon) {
        var _this = this;

        return this.dbVersionSupport.supportsClassNameNamespacedEndpointsPromise().then(function (support) {
          var match = new RegExp(_this.beaconRegExp).exec(beacon);

          if (!match) {
            return beacon;
          }

          var className;
          var id;

          if (match[4] !== undefined) {
            id = match[4];
            className = match[2];
          } else {
            id = match[2];
          }

          var beaconPath = beaconPathPrefix;

          if (support.supports) {
            if (isValidStringProperty(className)) {
              beaconPath = "".concat(beaconPath, "/").concat(className);
            } else {
              support.warns.deprecatedNonClassNameNamespacedEndpointsForBeacons();
            }
          } else {
            support.warns.notSupportedClassNamespacedEndpointsForBeacons();
          }

          if (isValidStringProperty(id)) {
            beaconPath = "".concat(beaconPath, "/").concat(id);
          }

          return beaconPath;
        });
      }
    }]);

    return BeaconPath;
  }();

  var data = function data(client, dbVersionSupport) {
    var objectsPath = new ObjectsPath(dbVersionSupport);
    var referencesPath = new ReferencesPath(dbVersionSupport);
    var beaconPath = new BeaconPath(dbVersionSupport);
    return {
      creator: function creator() {
        return new Creator(client, objectsPath);
      },
      validator: function validator() {
        return new Validator(client);
      },
      updater: function updater() {
        return new Updater(client, objectsPath);
      },
      merger: function merger() {
        return new Merger(client, objectsPath);
      },
      getter: function getter() {
        return new Getter$2(client, objectsPath);
      },
      getterById: function getterById() {
        return new GetterById(client, objectsPath);
      },
      deleter: function deleter() {
        return new Deleter(client, objectsPath);
      },
      checker: function checker() {
        return new Checker(client, objectsPath);
      },
      referenceCreator: function referenceCreator() {
        return new ReferenceCreator(client, referencesPath, beaconPath);
      },
      referenceReplacer: function referenceReplacer() {
        return new ReferenceReplacer(client, referencesPath, beaconPath);
      },
      referenceDeleter: function referenceDeleter() {
        return new ReferenceDeleter(client, referencesPath, beaconPath);
      },
      referencePayloadBuilder: function referencePayloadBuilder() {
        return new ReferencePayloadBuilder(client);
      }
    };
  };

  var Getter$3 = function Getter(client) {
    var _this = this;

    _classCallCheck(this, Getter);

    _defineProperty(this, "withId", function (id) {
      _this.id = id;
      return _this;
    });

    _defineProperty(this, "validateIsSet", function (prop, name, setter) {
      if (prop == undefined || prop == null || prop.length == 0) {
        _this.errors = [].concat(_toConsumableArray(_this.errors), ["".concat(name, " must be set - set with ").concat(setter)]);
      }
    });

    _defineProperty(this, "validateId", function () {
      _this.validateIsSet(_this.id, "id", ".withId(id)");
    });

    _defineProperty(this, "validate", function () {
      _this.validateId();
    });

    _defineProperty(this, "do", function () {
      _this.validate();

      if (_this.errors.length > 0) {
        return Promise.reject(new Error("invalid usage: " + _this.errors.join(", ")));
      }

      var path = "/classifications/".concat(_this.id);
      return _this.client.get(path);
    });

    this.client = client;
    this.errors = [];
  };

  var Scheduler = function Scheduler(client) {
    var _this = this;

    _classCallCheck(this, Scheduler);

    _defineProperty(this, "withType", function (type) {
      _this.type = type;
      return _this;
    });

    _defineProperty(this, "withSettings", function (settings) {
      _this.settings = settings;
      return _this;
    });

    _defineProperty(this, "withClassName", function (className) {
      _this.className = className;
      return _this;
    });

    _defineProperty(this, "withClassifyProperties", function (props) {
      _this.classifyProperties = props;
      return _this;
    });

    _defineProperty(this, "withBasedOnProperties", function (props) {
      _this.basedOnProperties = props;
      return _this;
    });

    _defineProperty(this, "withWaitForCompletion", function () {
      _this.waitForCompletion = true;
      return _this;
    });

    _defineProperty(this, "withWaitTimeout", function (timeout) {
      _this.waitTimeout = timeout;
      return _this;
    });

    _defineProperty(this, "validateIsSet", function (prop, name, setter) {
      if (prop == undefined || prop == null || prop.length == 0) {
        _this.errors = [].concat(_toConsumableArray(_this.errors), ["".concat(name, " must be set - set with ").concat(setter)]);
      }
    });

    _defineProperty(this, "validateClassName", function () {
      _this.validateIsSet(_this.className, "className", ".withClassName(className)");
    });

    _defineProperty(this, "validateBasedOnProperties", function () {
      _this.validateIsSet(_this.basedOnProperties, "basedOnProperties", ".withBasedOnProperties(basedOnProperties)");
    });

    _defineProperty(this, "validateClassifyProperties", function () {
      _this.validateIsSet(_this.classifyProperties, "classifyProperties", ".withClassifyProperties(classifyProperties)");
    });

    _defineProperty(this, "validate", function () {
      _this.validateClassName();

      _this.validateClassifyProperties();

      _this.validateBasedOnProperties();
    });

    _defineProperty(this, "payload", function () {
      return {
        type: _this.type,
        settings: _this.settings,
        "class": _this.className,
        classifyProperties: _this.classifyProperties,
        basedOnProperties: _this.basedOnProperties
      };
    });

    _defineProperty(this, "pollForCompletion", function (id) {
      return new Promise(function (resolve, reject) {
        setTimeout(function () {
          return reject(new Error("classification didn't finish within configured timeout, " + "set larger timeout with .withWaitTimeout(timeout)"));
        }, _this.waitTimeout);
        setInterval(function () {
          new Getter$3(_this.client).withId(id)["do"]().then(function (res) {
            res.status == "completed" && resolve(res);
          });
        }, 500);
      });
    });

    _defineProperty(this, "do", function () {
      if (_this.errors.length > 0) {
        return Promise.reject(new Error("invalid usage: " + _this.errors.join(", ")));
      }

      _this.validate();

      var path = "/classifications";
      return _this.client.post(path, _this.payload()).then(function (res) {
        if (!_this.waitForCompletion) {
          return Promise.resolve(res);
        }

        return _this.pollForCompletion(res.id);
      });
    });

    this.client = client;
    this.errors = [];
    this.waitTimeout = 10 * 60 * 1000; // 10 minutes

    this.waitForCompletion = false;
  };

  var data$1 = function data(client) {
    return {
      scheduler: function scheduler() {
        return new Scheduler(client);
      },
      getter: function getter() {
        return new Getter$3(client);
      }
    };
  };

  var ObjectsBatcher = function ObjectsBatcher(client) {
    var _this = this;

    _classCallCheck(this, ObjectsBatcher);

    _defineProperty(this, "withObject", function (obj) {
      _this.objects = [].concat(_toConsumableArray(_this.objects), [obj]);
      return _this;
    });

    _defineProperty(this, "payload", function () {
      return {
        objects: _this.objects
      };
    });

    _defineProperty(this, "validateObjectCount", function () {
      if (_this.objects.length == 0) {
        _this.errors = [].concat(_toConsumableArray(_this.errors), ["need at least one object to send a request, " + "add one with .withObject(obj)"]);
      }
    });

    _defineProperty(this, "validate", function () {
      _this.validateObjectCount();
    });

    _defineProperty(this, "do", function () {
      _this.validate();

      if (_this.errors.length > 0) {
        return Promise.reject(new Error("invalid usage: " + _this.errors.join(", ")));
      }

      var path = "/batch/objects";
      return _this.client.post(path, _this.payload());
    });

    this.client = client;
    this.objects = [];
    this.errors = [];
  };

  var ObjectsBatchDeleter = /*#__PURE__*/function () {
    function ObjectsBatchDeleter(client) {
      _classCallCheck(this, ObjectsBatchDeleter);

      _defineProperty(this, "className", void 0);

      _defineProperty(this, "whereFilter", void 0);

      _defineProperty(this, "output", void 0);

      _defineProperty(this, "dryRun", void 0);

      this.client = client;
      this.errors = [];
    }

    _createClass(ObjectsBatchDeleter, [{
      key: "withClassName",
      value: function withClassName(className) {
        this.className = className;
        return this;
      }
    }, {
      key: "withWhere",
      value: function withWhere(whereFilter) {
        this.whereFilter = whereFilter;
        return this;
      }
    }, {
      key: "withOutput",
      value: function withOutput(output) {
        this.output = output;
        return this;
      }
    }, {
      key: "withDryRun",
      value: function withDryRun(dryRun) {
        this.dryRun = dryRun;
        return this;
      }
    }, {
      key: "payload",
      value: function payload() {
        return {
          match: {
            "class": this.className,
            where: this.whereFilter
          },
          output: this.output,
          dryRun: this.dryRun
        };
      }
    }, {
      key: "validateClassName",
      value: function validateClassName() {
        if (!isValidStringProperty(this.className)) {
          this.errors = [].concat(_toConsumableArray(this.errors), ["string className must be set - set with .withClassName(className)"]);
        }
      }
    }, {
      key: "validateWhereFilter",
      value: function validateWhereFilter() {
        if (_typeof(this.whereFilter) != "object") {
          this.errors = [].concat(_toConsumableArray(this.errors), ["object where must be set - set with .withWhere(whereFilter)"]);
        }
      }
    }, {
      key: "validate",
      value: function validate() {
        this.validateClassName();
        this.validateWhereFilter();
      }
    }, {
      key: "do",
      value: function _do() {
        this.validate();

        if (this.errors.length > 0) {
          return Promise.reject(new Error("invalid usage: " + this.errors.join(", ")));
        }

        var path = "/batch/objects";
        return this.client["delete"](path, this.payload(), true);
      }
    }]);

    return ObjectsBatchDeleter;
  }();

  var ReferencesBatcher = /*#__PURE__*/function () {
    function ReferencesBatcher(client, beaconPath) {
      var _this = this;

      _classCallCheck(this, ReferencesBatcher);

      _defineProperty(this, "withReference", function (obj) {
        _this.references = [].concat(_toConsumableArray(_this.references), [obj]);
        return _this;
      });

      _defineProperty(this, "payload", function () {
        return _this.references;
      });

      _defineProperty(this, "validateReferenceCount", function () {
        if (_this.references.length == 0) {
          _this.errors = [].concat(_toConsumableArray(_this.errors), ["need at least one reference to send a request, " + "add one with .withReference(obj)"]);
        }
      });

      _defineProperty(this, "validate", function () {
        _this.validateReferenceCount();
      });

      _defineProperty(this, "do", function () {
        _this.validate();

        if (_this.errors.length > 0) {
          return Promise.reject(new Error("invalid usage: " + _this.errors.join(", ")));
        }

        var path = "/batch/references";
        var payloadPromise = Promise.all(_this.references.map(function (ref) {
          return _this.rebuildReferencePromise(ref);
        }));
        return payloadPromise.then(function (payload) {
          return _this.client.post(path, payload);
        });
      });

      this.client = client;
      this.beaconPath = beaconPath;
      this.references = [];
      this.errors = [];
    }

    _createClass(ReferencesBatcher, [{
      key: "rebuildReferencePromise",
      value: function rebuildReferencePromise(reference) {
        return this.beaconPath.rebuild(reference.to).then(function (beaconTo) {
          return {
            from: reference.from,
            to: beaconTo
          };
        });
      }
    }]);

    return ReferencesBatcher;
  }();

  var ReferencesBatcher$1 = /*#__PURE__*/function () {
    function ReferencesBatcher(client) {
      var _this = this;

      _classCallCheck(this, ReferencesBatcher);

      _defineProperty(this, "withFromId", function (id) {
        _this.fromId = id;
        return _this;
      });

      _defineProperty(this, "withToId", function (id) {
        _this.toId = id;
        return _this;
      });

      _defineProperty(this, "withFromClassName", function (className) {
        _this.fromClassName = className;
        return _this;
      });

      _defineProperty(this, "withFromRefProp", function (refProp) {
        _this.fromRefProp = refProp;
        return _this;
      });

      _defineProperty(this, "validateIsSet", function (prop, name, setter) {
        if (prop == undefined || prop == null || prop.length == 0) {
          _this.errors = [].concat(_toConsumableArray(_this.errors), ["".concat(name, " must be set - set with ").concat(setter)]);
        }
      });

      _defineProperty(this, "validate", function () {
        _this.validateIsSet(_this.fromId, "fromId", ".withFromId(id)");

        _this.validateIsSet(_this.toId, "toId", ".withToId(id)");

        _this.validateIsSet(_this.fromClassName, "fromClassName", ".withFromClassName(className)");

        _this.validateIsSet(_this.fromRefProp, "fromRefProp", ".withFromRefProp(refProp)");
      });

      _defineProperty(this, "payload", function () {
        _this.validate();

        if (_this.errors.length > 0) {
          throw new Error(_this.errors.join(", "));
        }

        var beaconTo = "weaviate://localhost";

        if (isValidStringProperty(_this.toClassName)) {
          beaconTo = "".concat(beaconTo, "/").concat(_this.toClassName);
        }

        return {
          from: "weaviate://localhost/".concat(_this.fromClassName) + "/".concat(_this.fromId, "/").concat(_this.fromRefProp),
          to: "".concat(beaconTo, "/").concat(_this.toId)
        };
      });

      this.client = client;
      this.errors = [];
    }

    _createClass(ReferencesBatcher, [{
      key: "withToClassName",
      value: function withToClassName(className) {
        this.toClassName = className;
        return this;
      }
    }]);

    return ReferencesBatcher;
  }();

  var batch = function batch(client, dbVersionSupport) {
    var beaconPath = new BeaconPath(dbVersionSupport);
    return {
      objectsBatcher: function objectsBatcher() {
        return new ObjectsBatcher(client);
      },
      objectsBatchDeleter: function objectsBatchDeleter() {
        return new ObjectsBatchDeleter(client);
      },
      referencesBatcher: function referencesBatcher() {
        return new ReferencesBatcher(client, beaconPath);
      },
      referencePayloadBuilder: function referencePayloadBuilder() {
        return new ReferencesBatcher$1(client);
      }
    };
  };

  var LiveChecker = function LiveChecker(client, dbVersionProvider) {
    var _this = this;

    _classCallCheck(this, LiveChecker);

    _defineProperty(this, "do", function () {
      return _this.client.get("/.well-known/live", false).then(function () {
        setTimeout(function () {
          return _this.dbVersionProvider.refresh();
        });
        return Promise.resolve(true);
      })["catch"](function () {
        return Promise.resolve(false);
      });
    });

    this.client = client;
    this.dbVersionProvider = dbVersionProvider;
  };

  var ReadyChecker = function ReadyChecker(client, dbVersionProvider) {
    var _this = this;

    _classCallCheck(this, ReadyChecker);

    _defineProperty(this, "do", function () {
      return _this.client.get("/.well-known/ready", false).then(function () {
        setTimeout(function () {
          return _this.dbVersionProvider.refresh();
        });
        return Promise.resolve(true);
      })["catch"](function () {
        return Promise.resolve(false);
      });
    });

    this.client = client;
    this.dbVersionProvider = dbVersionProvider;
  };

  var MetaGetter = function MetaGetter(client) {
    var _this = this;

    _classCallCheck(this, MetaGetter);

    _defineProperty(this, "do", function () {
      return _this.client.get("/meta", true);
    });

    this.client = client;
  };

  var OpenidConfigurationGetterGetter = function OpenidConfigurationGetterGetter(client) {
    var _this = this;

    _classCallCheck(this, OpenidConfigurationGetterGetter);

    _defineProperty(this, "do", function () {
      return _this.client.getRaw("/.well-known/openid-configuration").then(function (res) {
        if (res.status < 400) {
          return res.json();
        }

        if (res.status == 404) {
          // OIDC is not configured
          return Promise.resolve(undefined);
        }

        return Promise.reject(new Error("unexpected status code: ".concat(res.status)));
      });
    });

    this.client = client;
  };

  var misc = function misc(client, dbVersionProvider) {
    return {
      liveChecker: function liveChecker() {
        return new LiveChecker(client, dbVersionProvider);
      },
      readyChecker: function readyChecker() {
        return new ReadyChecker(client, dbVersionProvider);
      },
      metaGetter: function metaGetter() {
        return new MetaGetter(client);
      },
      openidConfigurationGetter: function openidConfigurationGetter() {
        return new OpenidConfigurationGetterGetter(client);
      }
    };
  };

  var ExtensionCreator = function ExtensionCreator(client) {
    var _this = this;

    _classCallCheck(this, ExtensionCreator);

    _defineProperty(this, "withConcept", function (concept) {
      _this.concept = concept;
      return _this;
    });

    _defineProperty(this, "withDefinition", function (definition) {
      _this.definition = definition;
      return _this;
    });

    _defineProperty(this, "withWeight", function (weight) {
      _this.weight = weight;
      return _this;
    });

    _defineProperty(this, "validateIsSet", function (prop, name, setter) {
      if (prop == undefined || prop == null || prop.length == 0) {
        _this.errors = [].concat(_toConsumableArray(_this.errors), ["".concat(name, " must be set - set with ").concat(setter)]);
      }
    });

    _defineProperty(this, "validate", function () {
      _this.validateIsSet(_this.concept, "concept", "withConcept(concept)");

      _this.validateIsSet(_this.definition, "definition", "withDefinition(definition)");

      _this.validateIsSet(_this.weight, "weight", "withWeight(weight)");
    });

    _defineProperty(this, "payload", function () {
      return {
        concept: _this.concept,
        definition: _this.definition,
        weight: _this.weight
      };
    });

    _defineProperty(this, "do", function () {
      _this.validate();

      if (_this.errors.length > 0) {
        return Promise.reject(new Error("invalid usage: " + _this.errors.join(", ")));
      }

      var path = "/modules/text2vec-contextionary/extensions";
      return _this.client.post(path, _this.payload());
    });

    this.client = client;
    this.errors = [];
  };

  var ConceptsGetter = function ConceptsGetter(client) {
    var _this = this;

    _classCallCheck(this, ConceptsGetter);

    _defineProperty(this, "validateIsSet", function (prop, name, setter) {
      if (prop == undefined || prop == null || prop.length == 0) {
        _this.errors = [].concat(_toConsumableArray(_this.errors), ["".concat(name, " must be set - set with ").concat(setter)]);
      }
    });

    _defineProperty(this, "withConcept", function (concept) {
      _this.concept = concept;
      return _this;
    });

    _defineProperty(this, "validate", function () {
      _this.validateIsSet(_this.concept, "concept", "withConcept(concept)");
    });

    _defineProperty(this, "do", function () {
      _this.validate();

      if (_this.errors.length > 0) {
        return Promise.reject(new Error("invalid usage: " + _this.errors.join(", ")));
      }

      var path = "/modules/text2vec-contextionary/concepts/".concat(_this.concept);
      return _this.client.get(path);
    });

    this.client = client;
    this.errors = [];
  };

  var c11y = function c11y(client) {
    return {
      conceptsGetter: function conceptsGetter() {
        return new ConceptsGetter(client);
      },
      extensionCreator: function extensionCreator() {
        return new ExtensionCreator(client);
      }
    };
  };

  var DbVersionSupport = /*#__PURE__*/function () {
    function DbVersionSupport(dbVersionProvider) {
      _classCallCheck(this, DbVersionSupport);

      this.dbVersionProvider = dbVersionProvider;
    }

    _createClass(DbVersionSupport, [{
      key: "supportsClassNameNamespacedEndpointsPromise",
      value: function supportsClassNameNamespacedEndpointsPromise() {
        var _this = this;

        return this.dbVersionProvider.getVersionPromise().then(function (version) {
          return {
            version: version,
            supports: _this.supportsClassNameNamespacedEndpoints(version),
            warns: {
              deprecatedNonClassNameNamespacedEndpointsForObjects: function deprecatedNonClassNameNamespacedEndpointsForObjects() {
                return console.warn("Usage of objects paths without className is deprecated in Weaviate ".concat(version, ". Please provide className parameter"));
              },
              deprecatedNonClassNameNamespacedEndpointsForReferences: function deprecatedNonClassNameNamespacedEndpointsForReferences() {
                return console.warn("Usage of references paths without className is deprecated in Weaviate ".concat(version, ". Please provide className parameter"));
              },
              deprecatedNonClassNameNamespacedEndpointsForBeacons: function deprecatedNonClassNameNamespacedEndpointsForBeacons() {
                return console.warn("Usage of beacons paths without className is deprecated in Weaviate ".concat(version, ". Please provide className parameter"));
              },
              notSupportedClassNamespacedEndpointsForObjects: function notSupportedClassNamespacedEndpointsForObjects() {
                return console.warn("Usage of objects paths with className is not supported in Weaviate ".concat(version, ". className parameter is ignored"));
              },
              notSupportedClassNamespacedEndpointsForReferences: function notSupportedClassNamespacedEndpointsForReferences() {
                return console.warn("Usage of references paths with className is not supported in Weaviate ".concat(version, ". className parameter is ignored"));
              },
              notSupportedClassNamespacedEndpointsForBeacons: function notSupportedClassNamespacedEndpointsForBeacons() {
                return console.warn("Usage of beacons paths with className is not supported in Weaviate ".concat(version, ". className parameter is ignored"));
              },
              notSupportedClassParameterInEndpointsForObjects: function notSupportedClassParameterInEndpointsForObjects() {
                return console.warn("Usage of objects paths with class query parameter is not supported in Weaviate ".concat(version, ". class query parameter is ignored"));
              }
            }
          };
        });
      } // >= 1.14

    }, {
      key: "supportsClassNameNamespacedEndpoints",
      value: function supportsClassNameNamespacedEndpoints(version) {
        if (typeof version === "string") {
          var versionNumbers = version.split(".");

          if (versionNumbers.length >= 2) {
            var major = parseInt(versionNumbers[0]);
            var minor = parseInt(versionNumbers[1]);
            return major == 1 && minor >= 14 || major >= 2;
          }
        }

        return false;
      }
    }]);

    return DbVersionSupport;
  }();
  var EMPTY_VERSION = "";
  var DbVersionProvider = /*#__PURE__*/function () {
    function DbVersionProvider(versionGetter) {
      _classCallCheck(this, DbVersionProvider);

      this.versionGetter = versionGetter;
      this.emptyVersionPromise = Promise.resolve(EMPTY_VERSION);
      this.versionPromise = undefined;
    }

    _createClass(DbVersionProvider, [{
      key: "getVersionPromise",
      value: function getVersionPromise() {
        if (this.versionPromise) {
          return this.versionPromise;
        }

        return this.versionGetter().then(assignPromise.bind(this));
      }
    }, {
      key: "refresh",
      value: function refresh() {
        var force = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : false;

        if (force || !this.versionPromise) {
          this.versionPromise = undefined;
          this.versionGetter().then(assignPromise.bind(this));
        }
      }
    }]);

    return DbVersionProvider;
  }();

  function assignPromise(version) {
    if (version === EMPTY_VERSION) {
      return this.emptyVersionPromise;
    }

    this.versionPromise = Promise.resolve(version);
    return this.versionPromise;
  }

  var app = {
    client: function client(params) {
      // check if the URL is set
      if (!params.host) throw new Error("Missing `host` parameter"); // check if the scheme is set

      if (!params.scheme) throw new Error("Missing `scheme` parameter"); // check if headers are set

      if (!params.headers) params.headers = {};

      var graphqlClient = require("graphql-client")({
        url: params.scheme + "://" + params.host + "/v1/graphql",
        headers: params.headers
      });

      var httpClient = require("./httpClient.js")({
        baseUri: params.scheme + "://" + params.host + "/v1",
        headers: params.headers
      });

      var dbVersionProvider = initDbVersionProvider(httpClient);
      var dbVersionSupport = new DbVersionSupport(dbVersionProvider);
      return {
        graphql: graphql(graphqlClient),
        schema: schema(httpClient),
        data: data(httpClient, dbVersionSupport),
        classifications: data$1(httpClient),
        batch: batch(httpClient, dbVersionSupport),
        misc: misc(httpClient, dbVersionProvider),
        c11y: c11y(httpClient)
      };
    },
    // constants
    KIND_THINGS: KIND_THINGS,
    KIND_ACTIONS: KIND_ACTIONS
  };

  function initDbVersionProvider(httpClient) {
    var metaGetter = misc(httpClient).metaGetter();

    var versionGetter = function versionGetter() {
      return metaGetter["do"]().then(function (result) {
        return result.version;
      })["catch"](function (_) {
        return Promise.resolve("");
      });
    };

    var dbVersionProvider = new DbVersionProvider(versionGetter);
    dbVersionProvider.refresh();
    return dbVersionProvider;
  }
  module.exports = app;

  return app;

})));

},{"./httpClient.js":4,"graphql-client":2}],6:[function(require,module,exports){
(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
  typeof define === 'function' && define.amd ? define(['exports'], factory) :
  (factory((global.WHATWGFetch = {})));
}(this, (function (exports) { 'use strict';

  var global =
    (typeof globalThis !== 'undefined' && globalThis) ||
    (typeof self !== 'undefined' && self) ||
    (typeof global !== 'undefined' && global);

  var support = {
    searchParams: 'URLSearchParams' in global,
    iterable: 'Symbol' in global && 'iterator' in Symbol,
    blob:
      'FileReader' in global &&
      'Blob' in global &&
      (function() {
        try {
          new Blob();
          return true
        } catch (e) {
          return false
        }
      })(),
    formData: 'FormData' in global,
    arrayBuffer: 'ArrayBuffer' in global
  };

  function isDataView(obj) {
    return obj && DataView.prototype.isPrototypeOf(obj)
  }

  if (support.arrayBuffer) {
    var viewClasses = [
      '[object Int8Array]',
      '[object Uint8Array]',
      '[object Uint8ClampedArray]',
      '[object Int16Array]',
      '[object Uint16Array]',
      '[object Int32Array]',
      '[object Uint32Array]',
      '[object Float32Array]',
      '[object Float64Array]'
    ];

    var isArrayBufferView =
      ArrayBuffer.isView ||
      function(obj) {
        return obj && viewClasses.indexOf(Object.prototype.toString.call(obj)) > -1
      };
  }

  function normalizeName(name) {
    if (typeof name !== 'string') {
      name = String(name);
    }
    if (/[^a-z0-9\-#$%&'*+.^_`|~!]/i.test(name) || name === '') {
      throw new TypeError('Invalid character in header field name: "' + name + '"')
    }
    return name.toLowerCase()
  }

  function normalizeValue(value) {
    if (typeof value !== 'string') {
      value = String(value);
    }
    return value
  }

  // Build a destructive iterator for the value list
  function iteratorFor(items) {
    var iterator = {
      next: function() {
        var value = items.shift();
        return {done: value === undefined, value: value}
      }
    };

    if (support.iterable) {
      iterator[Symbol.iterator] = function() {
        return iterator
      };
    }

    return iterator
  }

  function Headers(headers) {
    this.map = {};

    if (headers instanceof Headers) {
      headers.forEach(function(value, name) {
        this.append(name, value);
      }, this);
    } else if (Array.isArray(headers)) {
      headers.forEach(function(header) {
        this.append(header[0], header[1]);
      }, this);
    } else if (headers) {
      Object.getOwnPropertyNames(headers).forEach(function(name) {
        this.append(name, headers[name]);
      }, this);
    }
  }

  Headers.prototype.append = function(name, value) {
    name = normalizeName(name);
    value = normalizeValue(value);
    var oldValue = this.map[name];
    this.map[name] = oldValue ? oldValue + ', ' + value : value;
  };

  Headers.prototype['delete'] = function(name) {
    delete this.map[normalizeName(name)];
  };

  Headers.prototype.get = function(name) {
    name = normalizeName(name);
    return this.has(name) ? this.map[name] : null
  };

  Headers.prototype.has = function(name) {
    return this.map.hasOwnProperty(normalizeName(name))
  };

  Headers.prototype.set = function(name, value) {
    this.map[normalizeName(name)] = normalizeValue(value);
  };

  Headers.prototype.forEach = function(callback, thisArg) {
    for (var name in this.map) {
      if (this.map.hasOwnProperty(name)) {
        callback.call(thisArg, this.map[name], name, this);
      }
    }
  };

  Headers.prototype.keys = function() {
    var items = [];
    this.forEach(function(value, name) {
      items.push(name);
    });
    return iteratorFor(items)
  };

  Headers.prototype.values = function() {
    var items = [];
    this.forEach(function(value) {
      items.push(value);
    });
    return iteratorFor(items)
  };

  Headers.prototype.entries = function() {
    var items = [];
    this.forEach(function(value, name) {
      items.push([name, value]);
    });
    return iteratorFor(items)
  };

  if (support.iterable) {
    Headers.prototype[Symbol.iterator] = Headers.prototype.entries;
  }

  function consumed(body) {
    if (body.bodyUsed) {
      return Promise.reject(new TypeError('Already read'))
    }
    body.bodyUsed = true;
  }

  function fileReaderReady(reader) {
    return new Promise(function(resolve, reject) {
      reader.onload = function() {
        resolve(reader.result);
      };
      reader.onerror = function() {
        reject(reader.error);
      };
    })
  }

  function readBlobAsArrayBuffer(blob) {
    var reader = new FileReader();
    var promise = fileReaderReady(reader);
    reader.readAsArrayBuffer(blob);
    return promise
  }

  function readBlobAsText(blob) {
    var reader = new FileReader();
    var promise = fileReaderReady(reader);
    reader.readAsText(blob);
    return promise
  }

  function readArrayBufferAsText(buf) {
    var view = new Uint8Array(buf);
    var chars = new Array(view.length);

    for (var i = 0; i < view.length; i++) {
      chars[i] = String.fromCharCode(view[i]);
    }
    return chars.join('')
  }

  function bufferClone(buf) {
    if (buf.slice) {
      return buf.slice(0)
    } else {
      var view = new Uint8Array(buf.byteLength);
      view.set(new Uint8Array(buf));
      return view.buffer
    }
  }

  function Body() {
    this.bodyUsed = false;

    this._initBody = function(body) {
      /*
        fetch-mock wraps the Response object in an ES6 Proxy to
        provide useful test harness features such as flush. However, on
        ES5 browsers without fetch or Proxy support pollyfills must be used;
        the proxy-pollyfill is unable to proxy an attribute unless it exists
        on the object before the Proxy is created. This change ensures
        Response.bodyUsed exists on the instance, while maintaining the
        semantic of setting Request.bodyUsed in the constructor before
        _initBody is called.
      */
      this.bodyUsed = this.bodyUsed;
      this._bodyInit = body;
      if (!body) {
        this._bodyText = '';
      } else if (typeof body === 'string') {
        this._bodyText = body;
      } else if (support.blob && Blob.prototype.isPrototypeOf(body)) {
        this._bodyBlob = body;
      } else if (support.formData && FormData.prototype.isPrototypeOf(body)) {
        this._bodyFormData = body;
      } else if (support.searchParams && URLSearchParams.prototype.isPrototypeOf(body)) {
        this._bodyText = body.toString();
      } else if (support.arrayBuffer && support.blob && isDataView(body)) {
        this._bodyArrayBuffer = bufferClone(body.buffer);
        // IE 10-11 can't handle a DataView body.
        this._bodyInit = new Blob([this._bodyArrayBuffer]);
      } else if (support.arrayBuffer && (ArrayBuffer.prototype.isPrototypeOf(body) || isArrayBufferView(body))) {
        this._bodyArrayBuffer = bufferClone(body);
      } else {
        this._bodyText = body = Object.prototype.toString.call(body);
      }

      if (!this.headers.get('content-type')) {
        if (typeof body === 'string') {
          this.headers.set('content-type', 'text/plain;charset=UTF-8');
        } else if (this._bodyBlob && this._bodyBlob.type) {
          this.headers.set('content-type', this._bodyBlob.type);
        } else if (support.searchParams && URLSearchParams.prototype.isPrototypeOf(body)) {
          this.headers.set('content-type', 'application/x-www-form-urlencoded;charset=UTF-8');
        }
      }
    };

    if (support.blob) {
      this.blob = function() {
        var rejected = consumed(this);
        if (rejected) {
          return rejected
        }

        if (this._bodyBlob) {
          return Promise.resolve(this._bodyBlob)
        } else if (this._bodyArrayBuffer) {
          return Promise.resolve(new Blob([this._bodyArrayBuffer]))
        } else if (this._bodyFormData) {
          throw new Error('could not read FormData body as blob')
        } else {
          return Promise.resolve(new Blob([this._bodyText]))
        }
      };

      this.arrayBuffer = function() {
        if (this._bodyArrayBuffer) {
          var isConsumed = consumed(this);
          if (isConsumed) {
            return isConsumed
          }
          if (ArrayBuffer.isView(this._bodyArrayBuffer)) {
            return Promise.resolve(
              this._bodyArrayBuffer.buffer.slice(
                this._bodyArrayBuffer.byteOffset,
                this._bodyArrayBuffer.byteOffset + this._bodyArrayBuffer.byteLength
              )
            )
          } else {
            return Promise.resolve(this._bodyArrayBuffer)
          }
        } else {
          return this.blob().then(readBlobAsArrayBuffer)
        }
      };
    }

    this.text = function() {
      var rejected = consumed(this);
      if (rejected) {
        return rejected
      }

      if (this._bodyBlob) {
        return readBlobAsText(this._bodyBlob)
      } else if (this._bodyArrayBuffer) {
        return Promise.resolve(readArrayBufferAsText(this._bodyArrayBuffer))
      } else if (this._bodyFormData) {
        throw new Error('could not read FormData body as text')
      } else {
        return Promise.resolve(this._bodyText)
      }
    };

    if (support.formData) {
      this.formData = function() {
        return this.text().then(decode)
      };
    }

    this.json = function() {
      return this.text().then(JSON.parse)
    };

    return this
  }

  // HTTP methods whose capitalization should be normalized
  var methods = ['DELETE', 'GET', 'HEAD', 'OPTIONS', 'POST', 'PUT'];

  function normalizeMethod(method) {
    var upcased = method.toUpperCase();
    return methods.indexOf(upcased) > -1 ? upcased : method
  }

  function Request(input, options) {
    if (!(this instanceof Request)) {
      throw new TypeError('Please use the "new" operator, this DOM object constructor cannot be called as a function.')
    }

    options = options || {};
    var body = options.body;

    if (input instanceof Request) {
      if (input.bodyUsed) {
        throw new TypeError('Already read')
      }
      this.url = input.url;
      this.credentials = input.credentials;
      if (!options.headers) {
        this.headers = new Headers(input.headers);
      }
      this.method = input.method;
      this.mode = input.mode;
      this.signal = input.signal;
      if (!body && input._bodyInit != null) {
        body = input._bodyInit;
        input.bodyUsed = true;
      }
    } else {
      this.url = String(input);
    }

    this.credentials = options.credentials || this.credentials || 'same-origin';
    if (options.headers || !this.headers) {
      this.headers = new Headers(options.headers);
    }
    this.method = normalizeMethod(options.method || this.method || 'GET');
    this.mode = options.mode || this.mode || null;
    this.signal = options.signal || this.signal;
    this.referrer = null;

    if ((this.method === 'GET' || this.method === 'HEAD') && body) {
      throw new TypeError('Body not allowed for GET or HEAD requests')
    }
    this._initBody(body);

    if (this.method === 'GET' || this.method === 'HEAD') {
      if (options.cache === 'no-store' || options.cache === 'no-cache') {
        // Search for a '_' parameter in the query string
        var reParamSearch = /([?&])_=[^&]*/;
        if (reParamSearch.test(this.url)) {
          // If it already exists then set the value with the current time
          this.url = this.url.replace(reParamSearch, '$1_=' + new Date().getTime());
        } else {
          // Otherwise add a new '_' parameter to the end with the current time
          var reQueryString = /\?/;
          this.url += (reQueryString.test(this.url) ? '&' : '?') + '_=' + new Date().getTime();
        }
      }
    }
  }

  Request.prototype.clone = function() {
    return new Request(this, {body: this._bodyInit})
  };

  function decode(body) {
    var form = new FormData();
    body
      .trim()
      .split('&')
      .forEach(function(bytes) {
        if (bytes) {
          var split = bytes.split('=');
          var name = split.shift().replace(/\+/g, ' ');
          var value = split.join('=').replace(/\+/g, ' ');
          form.append(decodeURIComponent(name), decodeURIComponent(value));
        }
      });
    return form
  }

  function parseHeaders(rawHeaders) {
    var headers = new Headers();
    // Replace instances of \r\n and \n followed by at least one space or horizontal tab with a space
    // https://tools.ietf.org/html/rfc7230#section-3.2
    var preProcessedHeaders = rawHeaders.replace(/\r?\n[\t ]+/g, ' ');
    // Avoiding split via regex to work around a common IE11 bug with the core-js 3.6.0 regex polyfill
    // https://github.com/github/fetch/issues/748
    // https://github.com/zloirock/core-js/issues/751
    preProcessedHeaders
      .split('\r')
      .map(function(header) {
        return header.indexOf('\n') === 0 ? header.substr(1, header.length) : header
      })
      .forEach(function(line) {
        var parts = line.split(':');
        var key = parts.shift().trim();
        if (key) {
          var value = parts.join(':').trim();
          headers.append(key, value);
        }
      });
    return headers
  }

  Body.call(Request.prototype);

  function Response(bodyInit, options) {
    if (!(this instanceof Response)) {
      throw new TypeError('Please use the "new" operator, this DOM object constructor cannot be called as a function.')
    }
    if (!options) {
      options = {};
    }

    this.type = 'default';
    this.status = options.status === undefined ? 200 : options.status;
    this.ok = this.status >= 200 && this.status < 300;
    this.statusText = options.statusText === undefined ? '' : '' + options.statusText;
    this.headers = new Headers(options.headers);
    this.url = options.url || '';
    this._initBody(bodyInit);
  }

  Body.call(Response.prototype);

  Response.prototype.clone = function() {
    return new Response(this._bodyInit, {
      status: this.status,
      statusText: this.statusText,
      headers: new Headers(this.headers),
      url: this.url
    })
  };

  Response.error = function() {
    var response = new Response(null, {status: 0, statusText: ''});
    response.type = 'error';
    return response
  };

  var redirectStatuses = [301, 302, 303, 307, 308];

  Response.redirect = function(url, status) {
    if (redirectStatuses.indexOf(status) === -1) {
      throw new RangeError('Invalid status code')
    }

    return new Response(null, {status: status, headers: {location: url}})
  };

  exports.DOMException = global.DOMException;
  try {
    new exports.DOMException();
  } catch (err) {
    exports.DOMException = function(message, name) {
      this.message = message;
      this.name = name;
      var error = Error(message);
      this.stack = error.stack;
    };
    exports.DOMException.prototype = Object.create(Error.prototype);
    exports.DOMException.prototype.constructor = exports.DOMException;
  }

  function fetch(input, init) {
    return new Promise(function(resolve, reject) {
      var request = new Request(input, init);

      if (request.signal && request.signal.aborted) {
        return reject(new exports.DOMException('Aborted', 'AbortError'))
      }

      var xhr = new XMLHttpRequest();

      function abortXhr() {
        xhr.abort();
      }

      xhr.onload = function() {
        var options = {
          status: xhr.status,
          statusText: xhr.statusText,
          headers: parseHeaders(xhr.getAllResponseHeaders() || '')
        };
        options.url = 'responseURL' in xhr ? xhr.responseURL : options.headers.get('X-Request-URL');
        var body = 'response' in xhr ? xhr.response : xhr.responseText;
        setTimeout(function() {
          resolve(new Response(body, options));
        }, 0);
      };

      xhr.onerror = function() {
        setTimeout(function() {
          reject(new TypeError('Network request failed'));
        }, 0);
      };

      xhr.ontimeout = function() {
        setTimeout(function() {
          reject(new TypeError('Network request failed'));
        }, 0);
      };

      xhr.onabort = function() {
        setTimeout(function() {
          reject(new exports.DOMException('Aborted', 'AbortError'));
        }, 0);
      };

      function fixUrl(url) {
        try {
          return url === '' && global.location.href ? global.location.href : url
        } catch (e) {
          return url
        }
      }

      xhr.open(request.method, fixUrl(request.url), true);

      if (request.credentials === 'include') {
        xhr.withCredentials = true;
      } else if (request.credentials === 'omit') {
        xhr.withCredentials = false;
      }

      if ('responseType' in xhr) {
        if (support.blob) {
          xhr.responseType = 'blob';
        } else if (
          support.arrayBuffer &&
          request.headers.get('Content-Type') &&
          request.headers.get('Content-Type').indexOf('application/octet-stream') !== -1
        ) {
          xhr.responseType = 'arraybuffer';
        }
      }

      if (init && typeof init.headers === 'object' && !(init.headers instanceof Headers)) {
        Object.getOwnPropertyNames(init.headers).forEach(function(name) {
          xhr.setRequestHeader(name, normalizeValue(init.headers[name]));
        });
      } else {
        request.headers.forEach(function(value, name) {
          xhr.setRequestHeader(name, value);
        });
      }

      if (request.signal) {
        request.signal.addEventListener('abort', abortXhr);

        xhr.onreadystatechange = function() {
          // DONE (success or failure)
          if (xhr.readyState === 4) {
            request.signal.removeEventListener('abort', abortXhr);
          }
        };
      }

      xhr.send(typeof request._bodyInit === 'undefined' ? null : request._bodyInit);
    })
  }

  fetch.polyfill = true;

  if (!global.fetch) {
    global.fetch = fetch;
    global.Headers = Headers;
    global.Request = Request;
    global.Response = Response;
  }

  exports.Headers = Headers;
  exports.Request = Request;
  exports.Response = Response;
  exports.fetch = fetch;

  Object.defineProperty(exports, '__esModule', { value: true });

})));

},{}]},{},[1]);
