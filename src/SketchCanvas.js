import React, {
  forwardRef,
  useImperativeHandle,
  useRef,
  useEffect,
  useState,
} from "react";
import PropTypes from "prop-types";
import ReactNative, {
  requireNativeComponent,
  NativeModules,
  UIManager,
  PanResponder,
  PixelRatio,
  Platform,
  ViewPropTypes,
  processColor,
} from "react-native";
import { requestPermissions } from "./handlePermissions";

const RNSketchCanvas = requireNativeComponent("RNSketchCanvas", SketchCanvas, {
  nativeOnly: {
    nativeID: true,
    onChange: true,
  },
});
const SketchCanvasManager = NativeModules.RNSketchCanvasManager || {};

function _processText(text) {
  text && text.forEach((t) => (t.fontColor = processColor(t.fontColor)));
  return text;
}

const SketchCanvasView = (props, ref) => {
  const [text, setText] = useState(
    _processText(
      props.text ? props.text.map((t) => Object.assign({}, t)) : null
    )
  );

  const _pathsToProcess = useRef([]);
  const _paths = useRef([]);
  const _path = useRef();
  const _handle = useRef();
  const _screenScale = useRef(Platform.OS === "ios" ? 1 : PixelRatio.get());
  const _offset = useRef({ x: 0, y: 0 });
  const _size = useRef({ width: 0, height: 0 });
  const _initialized = useRef(false);

  useEffect(() => {
    setText(
      _processText(
        props.text ? props.text.map((t) => Object.assign({}, t)) : null
      )
    );
  }, [props.text]);

  function addPath(data) {
    if (_initialized.current) {
      if (_paths.current.filter((p) => p.path.id === data.path.id).length === 0)
        _paths.current.push(data);
      const pathData = data.path.data.map((p) => {
        const coor = p.split(",").map((pp) => parseFloat(pp).toFixed(2));
        return `${
          (coor[0] * _screenScale.current * _size.current.width) /
          data.size.width
        },${
          (coor[1] * _screenScale.current * _size.current.height) /
          data.size.height
        }`;
      });
      UIManager.dispatchViewManagerCommand(
        _handle.current,
        UIManager.RNSketchCanvas.Commands.addPath,
        [
          data.path.id,
          processColor(data.path.color),
          data.path.width * _screenScale.current,
          pathData,
        ]
      );
    } else {
      _pathsToProcess.current.filter((p) => p.path.id === data.path.id)
        .length === 0 && _pathsToProcess.current.push(data);
    }
  }

  function deletePath(id) {
    _paths.current = _paths.current.filter((p) => p.path.id !== id);
    UIManager.dispatchViewManagerCommand(
      _handle.current,
      UIManager.RNSketchCanvas.Commands.deletePath,
      [id]
    );
  }

  useImperativeHandle(ref, () => {
    return {
      save(
        imageType,
        transparent,
        folder,
        filename,
        includeImage,
        includeText,
        cropToImageSize
      ) {
        UIManager.dispatchViewManagerCommand(
          _handle.current,
          UIManager.RNSketchCanvas.Commands.save,
          [
            imageType,
            folder,
            filename,
            transparent,
            includeImage,
            includeText,
            cropToImageSize,
          ]
        );
      },

      getPaths() {
        return _paths.current;
      },

      getBase64(
        imageType,
        transparent,
        includeImage,
        includeText,
        cropToImageSize,
        callback
      ) {
        if (Platform.OS === "ios") {
          SketchCanvasManager.transferToBase64(
            _handle.current,
            imageType,
            transparent,
            includeImage,
            includeText,
            cropToImageSize,
            callback
          );
        } else {
          NativeModules.SketchCanvasModule.transferToBase64(
            _handle.current,
            imageType,
            transparent,
            includeImage,
            includeText,
            cropToImageSize,
            callback
          );
        }
      },

      clear() {
        _paths.current = [];
        _path.current = null;
        UIManager.dispatchViewManagerCommand(
          _handle.current,
          UIManager.RNSketchCanvas.Commands.clear,
          []
        );
      },

      undo() {
        let lastId = -1;
        _paths.current.forEach(
          (d) => (lastId = d.drawer === props.user ? d.path.id : lastId)
        );
        if (lastId >= 0) deletePath(lastId);
        return lastId;
      },
    };
  });

  const onPanResponderGrant = (evt, gestureState) => {
      evt.persist();
      console.log("[pan] grant", props.strokeColor, evt, gestureState);

      if (!props.touchEnabled) return;
      const e = evt.nativeEvent;
      _offset.current = {
        x: e.pageX - e.locationX,
        y: e.pageY - e.locationY,
      };
      _path.current = {
        id: parseInt(Math.random() * 100000000),
        color: props.strokeColor,
        width: props.strokeWidth,
        data: [],
      };

      UIManager.dispatchViewManagerCommand(
        _handle.current,
        UIManager.RNSketchCanvas.Commands.newPath,
        [
          _path.current.id,
          processColor(_path.current.color),
          _path.current.width * _screenScale.current,
        ]
      );
      UIManager.dispatchViewManagerCommand(
        _handle.current,
        UIManager.RNSketchCanvas.Commands.addPoint,
        [
          parseFloat(
            (gestureState.x0 - _offset.current.x).toFixed(2) *
              _screenScale.current
          ),
          parseFloat(
            (gestureState.y0 - _offset.current.y).toFixed(2) *
              _screenScale.current
          ),
        ]
      );
      const x = parseFloat((gestureState.x0 - _offset.current.x).toFixed(2)),
        y = parseFloat((gestureState.y0 - _offset.current.y).toFixed(2));
      _path.current.data.push(`${x},${y}`);
      props.onStrokeStart(x, y);
    }
  
  const onPanResponderMove= (evt, gestureState) => {
    if (!props.touchEnabled) return;
    if (_path.current) {
      UIManager.dispatchViewManagerCommand(
        _handle.current,
        UIManager.RNSketchCanvas.Commands.addPoint,
        [
          parseFloat(
            (gestureState.moveX - _offset.current.x).toFixed(2) *
              _screenScale.current
          ),
          parseFloat(
            (gestureState.moveY - _offset.current.y).toFixed(2) *
              _screenScale.current
          ),
        ]
      );
      const x = parseFloat(
          (gestureState.moveX - _offset.current.x).toFixed(2)
        ),
        y = parseFloat((gestureState.moveY - _offset.current.y).toFixed(2));
      _path.current.data.push(`${x},${y}`);
      props.onStrokeChanged(x, y);
    }
  }

  const onPanResponderRelease = (evt, gestureState) => {
    if (!props.touchEnabled) return;
    if (_path.current) {
      props.onStrokeEnd({
        path: _path.current,
        size: _size.current,
        drawer: props.user,
      });
      _paths.current.push({
        path: _path.current,
        size: _size.current,
        drawer: props.user,
      });
    }
    UIManager.dispatchViewManagerCommand(
      _handle.current,
      UIManager.RNSketchCanvas.Commands.endPath,
      []
    );
  }
  const panResponder = PanResponder.create({
      // Ask to be the responder:
      onStartShouldSetPanResponder: (evt, gestureState) => true,
      onStartShouldSetPanResponderCapture: (evt, gestureState) => true,
      onMoveShouldSetPanResponder: (evt, gestureState) => true,
      onMoveShouldSetPanResponderCapture: (evt, gestureState) => true,

      onPanResponderGrant,
      onPanResponderMove,
      onPanResponderRelease,

      onShouldBlockNativeResponder: (evt, gestureState) => {
        return true;
      },
    })

  useEffect(() => {
    requestPermissions(
      props.permissionDialogTitle,
      props.permissionDialogMessage
    );
  }, [props.permissionDialogMessage, props.permissionDialogTitle]);

  return (
    <RNSketchCanvas
      ref={(ref) => {
        _handle.current = ReactNative.findNodeHandle(ref);
      }}
      style={props.style}
      onLayout={(e) => {
        _size.current = {
          width: e.nativeEvent.layout.width,
          height: e.nativeEvent.layout.height,
        };
        _initialized.current = true;
        _pathsToProcess.current.length > 0 &&
          _pathsToProcess.current.forEach((p) => addPath(p));
      }}
      {...panResponder.panHandlers}
      onChange={(e) => {
        if (e.nativeEvent.hasOwnProperty("pathsUpdate")) {
          props.onPathsChange(e.nativeEvent.pathsUpdate);
        } else if (
          e.nativeEvent.hasOwnProperty("success") &&
          e.nativeEvent.hasOwnProperty("path")
        ) {
          props.onSketchSaved(e.nativeEvent.success, e.nativeEvent.path);
        } else if (e.nativeEvent.hasOwnProperty("success")) {
          props.onSketchSaved(e.nativeEvent.success);
        }
      }}
      localSourceImage={props.localSourceImage}
      permissionDialogTitle={props.permissionDialogTitle}
      permissionDialogMessage={props.permissionDialogMessage}
      text={text}
    />
  );
};
const SketchCanvas = forwardRef(SketchCanvasView);

SketchCanvas.propTypes = {
  style: ViewPropTypes.style,
  strokeColor: PropTypes.string,
  strokeWidth: PropTypes.number,
  onPathsChange: PropTypes.func,
  onStrokeStart: PropTypes.func,
  onStrokeChanged: PropTypes.func,
  onStrokeEnd: PropTypes.func,
  onSketchSaved: PropTypes.func,
  user: PropTypes.string,

  touchEnabled: PropTypes.bool,

  text: PropTypes.arrayOf(
    PropTypes.shape({
      text: PropTypes.string,
      font: PropTypes.string,
      fontSize: PropTypes.number,
      fontColor: PropTypes.string,
      overlay: PropTypes.oneOf(["TextOnSketch", "SketchOnText"]),
      anchor: PropTypes.shape({ x: PropTypes.number, y: PropTypes.number }),
      position: PropTypes.shape({ x: PropTypes.number, y: PropTypes.number }),
      coordinate: PropTypes.oneOf(["Absolute", "Ratio"]),
      alignment: PropTypes.oneOf(["Left", "Center", "Right"]),
      lineHeightMultiple: PropTypes.number,
    })
  ),
  localSourceImage: PropTypes.shape({
    filename: PropTypes.string,
    directory: PropTypes.string,
    mode: PropTypes.oneOf(["AspectFill", "AspectFit", "ScaleToFill"]),
  }),

  permissionDialogTitle: PropTypes.string,
  permissionDialogMessage: PropTypes.string,
};

SketchCanvas.defaultProps = {
  style: null,
  strokeColor: "#000000",
  strokeWidth: 3,
  onPathsChange: () => {},
  onStrokeStart: () => {},
  onStrokeChanged: () => {},
  onStrokeEnd: () => {},
  onSketchSaved: () => {},
  user: null,

  touchEnabled: true,

  text: null,
  localSourceImage: null,

  permissionDialogTitle: "",
  permissionDialogMessage: "",
};

SketchCanvas.MAIN_BUNDLE =
  Platform.OS === "ios"
    ? UIManager.RNSketchCanvas.Constants.MainBundlePath
    : "";
SketchCanvas.DOCUMENT =
  Platform.OS === "ios"
    ? UIManager.RNSketchCanvas.Constants.NSDocumentDirectory
    : "";
SketchCanvas.LIBRARY =
  Platform.OS === "ios"
    ? UIManager.RNSketchCanvas.Constants.NSLibraryDirectory
    : "";
SketchCanvas.CACHES =
  Platform.OS === "ios"
    ? UIManager.RNSketchCanvas.Constants.NSCachesDirectory
    : "";

module.exports = SketchCanvas;
