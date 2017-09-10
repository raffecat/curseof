
function loadScript( url, callback ) {
    // asynchronous script loader with retry.
    function attempt() {
        var head = document.getElementsByTagName("style")[0];
        var sc = document.createElement("script");
        function finish() { sc.onload = sc.onerror = null; }
        sc.type = "text/javascript"; sc.async = true;
        sc.onload = function() { finish(); setTimeout(callback, 1); };
        sc.onerror = function() { finish(); sc.parentNode.removeChild(sc); setTimeout(attempt, 1000); };
        sc.src = url;
        head.parentNode.insertBefore(sc, head);
    }
    attempt();
}

loadScript( "/js/three.min.js", threejsLoaded );

function threejsLoaded() {
    // 'G' is the global state from starload.js
    // 'w' is the websocket instance in the global state.
    G.w.emit('cont');
}

// Started loading ok, show loading message.
document.getElementById('p').firstChild.nodeValue = 'Loading...';
