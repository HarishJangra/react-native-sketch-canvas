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

  const _paths = useRef([]);
  const _path = useRef();
  const _handle = useRef();
  const _size = useRef({ width: 0, height: 0 });
  const _initialized = useRef(false);

  useEffect(() => {
    setText(
      _processText(
        props.text ? props.text.map((t) => Object.assign({}, t)) : null
      )
    );
  }, [props.text]);


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
          "save",
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
          "clear",
          []
        );
      },

      undo() {
        UIManager.dispatchViewManagerCommand(
          _handle.current,
          "undo",
          []
        );
      },
    };
  });

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
      strokeColor={processColor(props.strokeColor) || processColor("#7a8a9a")}
      strokeWidth={props.strokeWidth || 2}
      toolType ={props.toolType}
      onLayout={(e) => {
        _size.current = {
          width: e.nativeEvent.layout.width,
          height: e.nativeEvent.layout.height,
        };
        _initialized.current = true;
      
      }}
      onChange={(e) => {
        console.log("change paths", e.nativeEvent);
        
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
  overlay: PropTypes.oneOf(["finger", "pen"]),

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
  toolType:"finger",

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
