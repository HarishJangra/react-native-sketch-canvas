package com.terrylinla.rnsketchcanvas;

import android.app.Activity;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.pm.ActivityInfo;
import android.content.res.Configuration;
import android.graphics.Color;
import android.util.Log;

import com.facebook.common.logging.FLog;
import com.facebook.react.bridge.Callback;
import com.facebook.react.bridge.ReadableArray;
import com.facebook.react.bridge.ReadableMap;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.common.ReactConstants;
import com.facebook.react.common.MapBuilder;
import com.facebook.react.modules.core.DeviceEventManagerModule;
import com.facebook.react.uimanager.SimpleViewManager;
import com.facebook.react.uimanager.ThemedReactContext;
import com.facebook.react.uimanager.annotations.ReactProp;

import java.util.HashMap;
import java.util.Map;
import java.util.ArrayList;
import android.graphics.PointF;

import androidx.annotation.NonNull;

import javax.annotation.Nullable;

public class SketchCanvasManager extends SimpleViewManager<SketchCanvas> {
    public static final String COMMAND_ADD_POINT = "addPoint";
    public static final String COMMAND_NEW_PATH = "newPath";
    public static final String COMMAND_CLEAR = "clear";
    public static final String COMMAND_ADD_PATH = "addPath";
    public static final String COMMAND_DELETE_PATH = "deletePath";
    public static final String COMMAND_SAVE = "save";
    public static final String COMMAND_END_PATH = "end";
    public static final String  COMMAND_UNDO = "undo";

    public static SketchCanvas Canvas = null;

    private static final String PROPS_LOCAL_SOURCE_IMAGE = "localSourceImage";
    private static final String PROPS_TEXT = "text";

    @Override
    public String getName() {
        return "RNSketchCanvas";
    }

    @Override
    protected SketchCanvas createViewInstance(ThemedReactContext context) {
        SketchCanvasManager.Canvas = new SketchCanvas(context);
        return SketchCanvasManager.Canvas;
    }

    @ReactProp(name = PROPS_LOCAL_SOURCE_IMAGE)
    public void setLocalSourceImage(SketchCanvas viewContainer, ReadableMap localSourceImage) {
        if (localSourceImage != null && localSourceImage.getString("filename") != null) {
            viewContainer.openImageFile(
                localSourceImage.hasKey("filename") ? localSourceImage.getString("filename") : null,
                localSourceImage.hasKey("directory") ? localSourceImage.getString("directory") : "",
                localSourceImage.hasKey("mode") ? localSourceImage.getString("mode") : ""
            );
        }
    }

    @ReactProp(name = PROPS_TEXT)
    public void setText(SketchCanvas viewContainer, ReadableArray text) {
        viewContainer.setCanvasText(text);
    }

    @ReactProp(name = "strokeColor")
    public void setStrokeColor(SketchCanvas viewContainer, int color) {
        viewContainer.setStrokeColor(color);
    }

    @ReactProp(name = "strokeWidth")
    public void setStrokeWidth(SketchCanvas viewContainer, int width) {
        viewContainer.setStrokeWidth(width);
    }

    @ReactProp(name = "toolType")
    public void setToolType(SketchCanvas viewContainer, String tooltype) {
        viewContainer.setToolType(tooltype);
    }


    @Override
    protected void addEventEmitters(ThemedReactContext reactContext, SketchCanvas view) {

    }

    @Override
    public void receiveCommand(@NonNull SketchCanvas view, String commandType, @androidx.annotation.Nullable ReadableArray args) {

        switch (commandType) {
            case COMMAND_ADD_POINT: {
                view.addPoint((float)args.getDouble(0), (float)args.getDouble(1));
                return;
            }
            case COMMAND_NEW_PATH: {
                view.newPath(args.getInt(0), args.getInt(1), (float)args.getDouble(2));
                return;
            }
            case COMMAND_CLEAR: {
                view.clear();
                return;
            }
            case COMMAND_ADD_PATH: {
                ReadableArray path = args.getArray(3);
                ArrayList<PointF> pointPath = new ArrayList<PointF>(path.size());
                for (int i=0; i<path.size(); i++) {
                    String[] coor = path.getString(i).split(",");
                    pointPath.add(new PointF(Float.parseFloat(coor[0]), Float.parseFloat(coor[1])));
                }
                view.addPath(args.getInt(0), args.getInt(1), (float)args.getDouble(2), pointPath);
                return;
            }
            case COMMAND_DELETE_PATH: {
                view.deletePath(args.getInt(0));
                return;
            }
            case COMMAND_SAVE: {
                view.save(args.getString(0), args.getString(1), args.getString(2), args.getBoolean(3), args.getBoolean(4), args.getBoolean(5), args.getBoolean(6));
                return;
            }
            case COMMAND_END_PATH: {
                view.end();
                return;
            }

            case COMMAND_UNDO: {
                view.undo();
                return;
            }
            default:
                throw new IllegalArgumentException(String.format(
                        "Unsupported command %d received by %s.",
                        commandType,
                        getClass().getSimpleName()));
        }
    }

}
