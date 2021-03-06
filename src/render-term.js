window.SEED = 0;
window.RNG = (N) => (SEED = (SEED * 22695477 + 1) % Math.pow(2,32), SEED % N);
setInterval(() => window.SEED = 0, 100);

const Inferno = require("inferno");
const Moon = require("moon-lang")();
const createClass = require("inferno-create-class");

let fetcher = null; // TODO: bad
(function fetch() {
  if (fetcher) {
    fetcher().then(() => {
      setTimeout(fetch, 3000);
    });
  } else {
    setTimeout(fetch, 3000);
  }
})();

const CachedMoonTerm = createClass({
  shouldComponentUpdate() {
    return false;
  },
  render() {
    return this.props.vNode;
  }
});

let caches = {};

module.exports = (term, path, size, appState, address, performIO, debug) => {
  const render = (term, env) => {
    if (typeof term === "string" || typeof term === "number") {
      return term;

    } else if (typeof term === "function") {
      return render(term(key => env[key]), env);

    } else if (term === null) {
      return null;

    } else if (typeof term === "object" && term.length !== undefined) {
      return [].map.call(term, child => render(child, env));

    } else if (typeof term === "object") {
      const O = {};
      const pos = term.pos || [0,0];
      const size = term.size || env.size;

      let newEnv = {
        size: size
      };

      for (let key in env) {
        newEnv[key] = env[key];
      }

      if (term.name) {
        newEnv.path = env.path.concat([term.name]);
      }

      if (term.size) {
        newEnv.size = [term.size[0], term.size[1]];
      }

      if (term.borders) {
        newEnv.size[0] -= (((term.borders||O).left||O).size||0) + (((term.borders||O).right||O).size||0);
        newEnv.size[1] -= (((term.borders||O).top||O).size||0) + (((term.borders||O).bottom||O).size||0);
      }

      if (term.set) {
        for (let key in term.set) {
          newEnv[key] = term.set[key];
        }
      }

      if (term.args) {
        for (let key in term.args) {
          if (newEnv[key] === undefined) {
            newEnv[key] = term.args[key];
          }
        }
      }

      if (term.state !== undefined) {
        const liveState = appState[newEnv.path.join("/")] || {};
        const baseState = term.state;
        newEnv.baseState = baseState;
        for (let key in baseState) {
          newEnv[key] = liveState[key] === undefined ? baseState[key] : liveState[key];
        }
      }

      if (term.onHear) {
        newEnv.yell = word => performIO(term.onHear(word), newEnv.baseState, env.path, env.yell);
      }

      if (term.onFetch) {
        fetcher = () => {
          return performIO(term.onFetch, newEnv.baseState, newEnv.path, newEnv.yell);
        }
      }

      const renderBorder = border =>
        border ?
          (border.size||0) + "px "
          + (border.style||"") + " "
          + (border.color||"")
        : null;

      const makeEvent = (bind, key) => ev => {
        if (term[key]) {
          performIO(bind(ev, term[key]), newEnv.baseState, newEnv.path, newEnv.yell);
          ev.stopPropagation();
        }
      };

      const mouse = (e,p) => p;
      const key = (e,p) => p({
        keyCode: e.keyCode,
        text: e.target.value
      });

      const textShadow = (term.font||O).shadow
        ? ( term.font.shadow.pos[0] + "px "
          + term.font.shadow.pos[1] + "px "
          + term.font.shadow.blur + "px "
          + term.font.shadow.color)
        : null;

      const cacheKey = newEnv.path.join("/") + "$" + term.cache;
      if (term.cache && caches[cacheKey]) {
        return caches[cacheKey];
      };
      
      const child = render(term.child, newEnv);

      ++RENDERED_NODES;
      var vNode = Inferno.createVNode(2,
        term.input ? "input" : "div",
        term.selectable ? "selectable" : "unselectable",
        term.input ? null : child,
        {
          value: term.input ? child : null,
          type: term.input ? term.type : null,
          placeholder: term.input ? term.placeholder : null,
          disabled: term.input && term.disabled ? true : false,
          style: {
            position: "absolute",
            left: pos[0] + "px",
            top: pos[1] + "px",
            width: size[0] + "px",
            height: size[1] + "px",
            cursor: term.cursor,
            overflow: term.scroll ? "scroll" : "hidden",
            outline: "none",
            fontSize: ((term.font||O).size || (size[1] * 0.9 || 0)) + "px",
            fontFamily: (term.font||O).family || null,
            fontWeight: (term.font||O).weight || null,
            fontStyle: (term.font||O).style || null,
            textAlign: (term.font||O).align || null,
            textShadow: textShadow,
            color: (term.font||O).color || null,
            paddingTop: ((term.paddings||O).top||0)+"px",
            paddingRight: ((term.paddings||O).right||0)+"px",
            paddingBottom: ((term.paddings||O).bottom||0)+"px",
            paddingLeft: ((term.paddings||O).left||0)+"px",
            borderTop: renderBorder((term.borders||O).top),
            borderRight: renderBorder((term.borders||O).right),
            borderBottom: renderBorder((term.borders||O).bottom),
            borderLeft: renderBorder((term.borders||O).left),
            borderRadius: term.radius ? term.radius+"px" : null,
            background: debug
              ? "rgb("+(200+RNG(55))+","+(200+RNG(55))+","+(200+RNG(55))+")"
              : term.background,
            backgroundSize: "cover"
          },
          onKeyPress: makeEvent(key, "onKeyPress"),
          onKeyUp: makeEvent(key, "onKeyUp"),
          onKeyDown: makeEvent(key, "onKeyDown"),
          onClick: makeEvent(mouse, "onClick"),
          onMouseDown: makeEvent(mouse, "onMouseDown"),
          onMouseUp: makeEvent(mouse, "onMouseUp")
        });

        if (term.cache) {
          caches[cacheKey] = <CachedMoonTerm vNode={vNode}/>;
          return caches[cacheKey];
        } else {
          return vNode;
        }
    } else {
      return "<?>";
    }
  }

  try {
    if (typeof term !== "object" || !term.name) {
      return <pre style={{padding:"4px"}}>
        {Moon.stringify(term)}
      </pre>;
    }
    var START_TIME = Date.now();
    var RENDERED_NODES = 0;
    const result = render(term, {
      path: path,
      size: size,
      yell: _ => performIO(do_ => do_("stop")),
      address: address
    });
    console.log
      ( "-> rendered "
      + RENDERED_NODES
      + " nodes of "
      + term.name
      + " in "
      + (Date.now() - START_TIME) / 1000
      + "s");
    return result;
  } catch (e) {
    console.log(e);
    return "Not renderable.";
  };
};
