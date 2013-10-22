var Rx        = require("rx");
var Existence = require("existence");

/**
 * The internal routing method
 *
 * @param Object data The request and response in an object
 * @param Object route The route map
 * @param Function fallback The fallback request handler
 * @return Observable
 */
var _router = function(data, routes, fallback) {
    var request = data.request;
    var method  = _matchMethod(request, routes);
    var path    = _matchPath(request, method);

    return path.getOrDefault(fallback);
};

/**
 * The internal method matching function
 *
 * @param IncomingMessage request The incoming request
 * @param Object routes The routes
 * @return Existence
 */
var _matchMethod = function(request, routes) {
    if (routes[request.method]) {
        return new Existence(routes[request.method]);
    } else {
        return new Existence(null);
    }
};

/**
 * The internal path matching function
 *
 * @param IncomingMessage request The incoming request
 * @param Existence optionalMethod The optional method
 * @return Existence
 */
var _matchPath = function(request, optionalMethod) {
    return optionalMethod.flatMap(function(method) {
        return method.reduce(function(found, tuple) {
            return found.orElse(function() {
                return _matchPathRegex(request, tuple[0]).orElse(function() {
                    return _matchPathString(request, tuple[0]);
                }).map(function(_) {
                    return tuple[1];
                });
            });
        }, new Existence());
    });
};

/**
 * The internal path matching function for regex paths
 *
 * @param IncomingMessage request The incoming request
 * @param RegExp path The path for a handler as a regex
 * @return Existence
 */
var _matchPathRegex = function(request, path) {
    if (path instanceof RegExp) {
        if (path.test(request.url)) {
            return new Existence(path);
        } else {
            return new Existence();
        }
    } else {
        return new Existence();
    }
};

/**
 * The internal path matching function for string paths
 *
 * @param IncomingMessage request The incoming request
 * @param RegExp path The path for a handler as a string
 * @return Existence
 */
var _matchPathString = function(request, path) {
    if (path == request.url) {
        return new Existence(path);
    } else {
        return new Existence();
    }
};

/**
 * The routing method
 *
 * @param Object http The http server object
 * @param Object routes The object containing the routes
 * @param Function fallback The fallback route handler
 * @return Observable
 */
module.exports = function(http, routes, fallback) {
    return Rx.Node.fromEvent(http, "request").map(function(args) {
        return { request: args[0], response: args[1] };
    }).flatMap(function(data) {
        var route = _router(data, routes, fallback);
        return route(data);
    });
};
