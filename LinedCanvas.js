import React, { Component } from "react";
import {
    View,
    ScrollView,
    Text,
    StyleSheet,
    Dimensions,
    TouchableOpacity,
    Platform,
    Image,
    SafeAreaView,
    Modal,
    TextInput,
    KeyboardAvoidingView,
    ImageBackground,
    Alert
} from 'react-native';
import { GestureHandlerRootView,  PinchGestureHandler, State, TapGestureHandler } from 'react-native-gesture-handler';
import { Svg, Circle, Rect, G, Line, Text as SVGText, Image as SVGImage, Polygon, Path } from "react-native-svg";
import { check, PERMISSIONS } from "react-native-permissions";
import ViewShot from "react-native-view-shot";
import { CameraRoll } from "@react-native-camera-roll/camera-roll";
import StorageUtil from "../../utils/StorageUtil";
import moment from "moment";
import { distanceToLine } from "../../utils/ShapeUtil";
import ImagePicker from 'react-native-image-crop-picker';
import NavigationBar from "../../components/NavigationBar";
import Toast from 'react-native-toast-message';
import ActionSheet from 'react-native-actionsheet';
import RNImageToPDF from 'react-native-image-to-pdf';
import TurboMailer from '@mattermost/react-native-turbo-mailer';
import LinearGradient from "react-native-linear-gradient";
const width = Dimensions.get('window').width
const UndoManager = require('undo-manager');

export default class LinedCanvas extends Component {
    constructor(props) {
        super(props)
        //svg画布固定 视口最小是画布尺寸的minimalScale倍，最大
        this.maxScale = 1;//最大缩放指数
        this.minimalScale = 0.25//最小缩放指数
        this.scale = 1
        this.lineWidth = 2;
        let now = moment().format('YYYY-MM-DD HH:mm:ss')
        if (props.route?.params?.id) {
            this.id = props.route?.params?.id//有id加载该id下的绘画数据
        } else {
            this.id = now
        }
        if (props.route?.params?.name) {
            this.name = props.route?.params?.name
        } else {
            this.name = "room1 window"
        }
        this.absorbDistance = 100;//最低吸附距离，低于该值表示可以吸附
        this.lineCapRadius = 6; //每个端点的圆点的半径
        this.doorSize = 20;
        this.angleLength = 30
        this.undoManager = new UndoManager();
        this.state = {
            font: 12,
            renameShow: false,
            savedFileFormat: 0,
            text: "",
            textWidth: 0,
            title: this.name,
            editedTitle: this.name,
            menuvisible: false,
            canvas: {
                width: 0,//画布宽度
                height: 0,//画布高度
                viewPortX: 0,//视口相对画布偏移X
                viewPortY: 0,//视口相对画布
                viewPortWidth: 0,//视口宽度
                viewPortHeight: 0,//视口高度
                primitives: [
                    // {
                    //     id: '1',
                    //     primitive: 'line',
                    //     points: [{x: 0, y: 100},{x: 100, y: 100}],
                    //     editing: true,
                        // marks: {
                        //     text: "99.99MM",
                        //     width: 10,
                        //     height: 10
                        //     visible: true
                        // },
                        // doors: [
                        // {id: 1, state: 0, origin: {x: 100, y: 100}, editing: false, l: "", h: ""}
                        //],
                        // door: {
                        //     state: 0, //0 左门朝下 1左门朝上 2右门朝上 3右门朝下
                        //     origin: {x: 100, y: 100},//门组的坐标
                        //     editing: false,//是否正在编辑
                        //     l: "", h: ""
                        // },
                        // windows: [{
                        //     id: 1, editing: false,
                        //     x: 0, y:0, data: '',l: "1.42m",
                        //     h: "2.00m"
                        // }],
                        // thirdPoint: {
                        //     x: 0,
                        //     y: 0,
                        //     r: 0
                        //     h: 0,//起拱形的高度,有正负分别
                        // }
                    // },
                    // {
                    //     id: '0',
                    //     primitive: 'line',
                    //     points: [{x: 100, y: 100},{x: 300, y: 300}],
                    //     editing: true,
                        // marks: {
                        //     text: "99.99MM",
                        //     width: 10,
                        //     height: 10
                        // },
                        // door: {
                        //     state: 0, //0 左门朝下 1左门朝上 2右门朝上 3右门朝下
                        //     origin: {x: 100, y: 100},//门组的坐标
                        //     editing: false,//是否正在编辑
                        // },
                        // window: {
                        //     x: 0, y:0, data: '',
                        // },
                        // thirdPoint: {
                        //     x: 0,
                        //     y: 0,
                        //     r: 0
                        // }
                    // },
                    // {
                    //     id: "123123",
                    //     primitive: 'marks',
                    //     origin: {
                    //         x: 100,
                    //         y: 100,
                    //         width: 100,
                    //         height: 20
                    //     },
                    //     marks: '4.92m2',
                    //     visible: true
                    // },
                    // {
                    //     id: 2,
                    //     primitive: 'curve',
                    //     editing: true,
                    //     points: [{x:0, y: 0}],
                    // }
                    // {id: 3, primitive: 'angle', line1id: '1', line2id: '0', angle: '60', editing: false}
                ],
            // ], //绘图命令
            },//所有有关画布的状态,集中在canvas状态里，方便做redo undo，方便保存
            auxiliary: [], //辅助线
            drawingPrimitiveType: '',//正在绘制的图形 line polygon 1 //Line Polygon n Path
            polyvisible: false,
            polynum: 0,

            markvisible: false,
            mark: "",

            marks: [],//面积标注历史记录
            linemarks: [],//直线标注历史记录
            angles: [],//标注的角度记录

            linemarkvisible: false, //直线标注对话框是否显示
            linemark: "",//记录直线标注
            usecurve: false,//是否曲线
            lineheight: 0,
            heightoutter: true,//向外扩展

            windowvisible: false,
            windowwidth: 0,
            windowheight: 0,

            anglevisible: false,
            angle: "",

            doorvisible: false,
            doorwidth: "",
            doorheight: "",
            doorstate: 0,

            svgWidth: 0,
            svgHeight: 0,



            sharevisible: false,

            polygons: [],//可以绘制的多边形种类

            // heightdirection: 0,
        }
        this.startPoint = null;//绘制的起点
        this.endPoint = null;//绘制的终点
    }

//从本地加载画布
async loadData(id) {
    try {
        let canvas = await StorageUtil.get(id)
        if (canvas != undefined) {
            this.notNeedLayout = true//不再需要onLayoutCanvas里设置画布
            this.setState({
                canvas: canvas
            })
        }
    } catch {

    }
}

async getMarks() {
    let marks = await StorageUtil.get("marks")
    let linemarks = await StorageUtil.get("linemarks")
    let angles = await StorageUtil.get("angles")
    this.setState({
        marks: marks ? marks : [],
        linemarks: linemarks ? linemarks : [],
        angles: angles ? angles : []
    })
}

//撤销一个操作
undo() {
    if (this.undoManager.hasUndo()) {
        this.undoManager.undo();
    }
}

//重做
redo() {
    if (this.undoManager.hasRedo()) {
        this.undoManager.redo()
    }
}

componentDidMount() {
    //如果有id那么加载id相关的画布
    let polys = ['polyon3', 'polygon4', 'polygon41', 'polygon42', 'polygon43', 'polygon5','polygon6','polygon8','polygon10','polygon12']
    let polygons = polys.map(p=>{
        return {
            id: p,
            icon: p,
            choosed: false
        }
    })
    this.setState({
        polygons: polygons
    })
    if (this.id?.length > 0) {
        this.loadData(this.id)
    }
    this.getMarks()
}

    //缩放事件
    onPinchEvent(event) {
        //scale 在
        let scale = event.nativeEvent.scale;
        let viewPortScale = this.tmpScale / scale
        // console.log("viewport scale is " + viewPortScale)
            if (viewPortScale < this.minimalScale || viewPortScale > this.maxScale) {
                //不能再缩小了
                // console.log("不能再缩小或放大了")
                return
            }
            // this.scale = viewPortScale
            let width = this.state.canvas.width * viewPortScale
            let height = this.state.canvas.height * viewPortScale
            let middlex = this.viewPortWidth / 2 + this.viewPortX
            let middley = this.viewPortHeight / 2 + this.viewPortY
            let vpX = middlex - width / 2
            let vpY = middley - height / 2
            this.state.canvas.viewPortWidth = width
                this.state.canvas.viewPortHeight = height
                this.state.canvas.viewPortX = vpX
                this.state.canvas.viewPortY = vpY
                this.shouldAddRedoForPinch = true
                this.setState({
                    canvas: this.state.canvas
                })
    }

    //缩放状态变化
    onPinchStateChange(event) {
        let state = event.nativeEvent.state;
        if (state == State.BEGAN) {
            this.viewPortX = this.state.canvas.viewPortX
            this.viewPortY = this.state.canvas.viewPortY
            this.viewPortWidth = this.state.canvas.viewPortWidth
            this.viewPortHeight = this.state.canvas.viewPortHeight
            this.shouldAddRedoForPinch = false
            this.tmpScale = this.state.canvas.viewPortWidth / this.state.canvas.width
            this.saveCanvasForRedoUndo()
        } else if (state == State.END || state == State.CANCELLED) {
            //添加一个redo undo
            this.scale = this.state.canvas.viewPortWidth / this.state.canvas.width
            this.viewPortX = this.state.canvas.viewPortX
            this.viewPortY = this.state.canvas.viewPortY
            this.viewPortWidth = this.state.canvas.viewPortWidth
            this.viewPortHeight = this.state.canvas.viewPortHeight
            if (this.shouldAddRedoForPinch) {
                this.addARedoUndoRecord();
            }
        }
    }

    //拖动事件
    onPanEvent(event) {
        if (event.nativeEvent.touches.length == 2) {
            return
        }
        if (this.state.drawingPrimitiveType == 'line') {
            console.log('绘制直线中')
            this.drawingLine(event)
        } else if (this.state.drawingPrimitiveType.indexOf('polygon') == 0) {
            console.log('绘制多边形中')
            this.drawingPolygon(event)
            return
        } else if (this.state.drawingPrimitiveType == "curve") {
            console.log("绘制多边形中")
            this.drawingCurve(event)
            return
        } else if (this.state.drawingPrimitiveType == "marks") {
            console.log("移动标注中")
            // this.drawingMarks(event)
        }
        else {
            if (this.canMoveCanvas) {
                this.panningCanvas(event)
            }
        }
    }
    //on pan began
    onPanBegin(event) {
        if (event.nativeEvent.touches.length == 2) {
            return
        }
        if (this.state.drawingPrimitiveType == 'line') {
            //准备绘制一条直线
            console.log('准备绘制一条直线')
            this.beginDrawLine(event)
            return
        } else if (this.state.drawingPrimitiveType.indexOf('polygon') == 0) {
            //准备绘制多边形
            console.log('准备绘制多边形')
            this.beginDrawPolygon(event)
            return
        } else if (this.state.drawingPrimitiveType == "curve") {
            console.log("准备绘制任意曲线")
            this.beginDrawCurve(event)
            return
        } else if (this.state.drawingPrimitiveType == 'marks') {
            console.log("准备绘制大标注")
            // this.beginDrawMarks(event)
            return
        }
        else {
            //准备移动画布 也可能是点击了某个图形传递下来的事件
            let editingPrimitive = this.state.canvas.primitives.find(primitive=>{
                return primitive.editing
            })
            this.canMoveCanvas = (editingPrimitive == undefined)
            if (this.canMoveCanvas) {
                this.beginPanCanvas(event)
            }
            return;
        }
    }

    onPanEnd(event) {
        if (event.nativeEvent.touches.length == 2) {
            console.log("2根手指平移")
            return
        }
        if (this.state.drawingPrimitiveType == 'line') {
            console.log('结束绘制直线')
            this.endDrawLine(event)
            return
        } else if (this.state.drawingPrimitiveType.indexOf('polygon') == 0) {
            console.log('结束绘制多边形')
            this.endDrawPolygon(event)
            return
        } else if (this.state.drawingPrimitiveType == "curve") {
            console.log("结束绘制任意曲线")
            this.endDrawCurve(event)
            return
        } else if (this.state.drawingPrimitiveType == "marks") {
            console.log("结束绘制标注")
            // this.endDrawMarks(event)
            return
        }
        else {
            if (this.canMoveCanvas) {
                this.endPanningCanvas(event)
            }
            return
        }
    }
    
    onPanStateChange(event) {
        let state = event.nativeEvent.state;
        if (state == State.BEGAN) {
            //点击开始，这里判断是否点击了某个图形
            if (this.state.drawingPrimitiveType == 'line') {
                //准备绘制一条直线
                console.log('准备绘制一条直线')
                this.beginDrawLine(event)
                return
            } else if (this.state.drawingPrimitiveType.indexOf('polygon') == 0) {
                //准备绘制多边形
                console.log('准备绘制多边形')
                this.beginDrawPolygon(event)
                return
            } else if (this.state.drawingPrimitiveType == "curve") {
                console.log("准备绘制任意曲线")
                this.beginDrawCurve(event)
                return
            }
            else {
                //准备移动画布 也可能是点击了某个图形传递下来的事件
                this.beginPanCanvas(event)
                //查找一下有没有正在编辑中的大标签
                // let primitive = this.getPrimitiveAt(event.nativeEvent.x, event.nativeEvent.y);
                // if (primitive) {
                //     let line = primitive.primitive
                //     this.onClickPrimitive(line)
                //     return
                // }
                return;
            }
        } else if (state == State.END) {
            if (this.state.drawingPrimitiveType == 'line') {
                console.log('结束绘制直线')
                this.endDrawLine(event)
                return
            } else if (this.state.drawingPrimitiveType.indexOf('polygon') == 0) {
                console.log('结束绘制多边形')
                this.endDrawPolygon(event)
                return
            } else if (this.state.drawingPrimitiveType == "curve") {
                console.log("结束绘制任意曲线")
                this.endDrawCurve(event)
                return
            }
            else {
                console.log("end panning")
                this.endPanningCanvas(event)
                return
            }
        }
    }

    async saveSVG() {
        StorageUtil.save(this.id, this.state.canvas)
        let filelist = await StorageUtil.get("docs")
        this.canvas.toDataURL((res)=>{
            let data = {
                id: this.id,
                name: this.name,
                preview: res
            }
            if (!filelist || filelist.length == 0) {
                filelist = [data]
            } else {
                filelist.push(data)
            }
            StorageUtil.save("docs", filelist)
            Toast.show({
                type: 'success',
                text1: '文件保存成功'
            })
        })
    }

    beginPanCanvas(event) {
        let viewPortX = this.state.canvas.viewPortX
        let viewPortY = this.state.canvas.viewPortY
        //这里需要暂时记录视口的偏移
        this.viewPortX =  viewPortX
        this.viewPortY = viewPortY
        this.initialLocationX = event.nativeEvent.locationX
        this.initialLocationY = event.nativeEvent.locationY
        this.shouldAddRedoForPan = false
        this.saveCanvasForRedoUndo();
    }

    panningCanvas(event) {
        // || this.useImageBackground
        let canvas = this.state.canvas;
        // console.log("canvas.width is " + canvas.width)
        let scale = canvas.viewPortWidth / canvas.width
        // console.log("scale is " + scale)
        let translationX = event.nativeEvent.locationX - this.initialLocationX
        // console.log("translationX is " + translationX)
        let translationY = event.nativeEvent.locationY - this.initialLocationY
        // console.log("translationY is " + translationY)
        let viewPortX = this.viewPortX-translationX * scale
        // console.log("view portx is " + viewPortX)
        let viewPortY = this.viewPortY-translationY * scale
        // console.log("view porty is " + viewPortY)
        canvas.viewPortX = viewPortX
        canvas.viewPortY = viewPortY
        // console.log("canvas is ")
        // console.log(canvas)
        this.shouldAddRedoForPan = true
        // if (viewPortX >= 0 && viewPortX < (canvas.width - canvas.viewPortWidth)) {
        //     canvas.viewPortX = viewPortX
        //     this.shouldAddRedoForPan = true
        // }
        // if (viewPortY >= 0 && viewPortY < (canvas.height - canvas.viewPortHeight)) {
        //     canvas.viewPortY = viewPortY
        //     this.shouldAddRedoForPan = true
        // }
        this.setState({
            canvas: canvas
        })
    }
    endPanningCanvas(event) {
        //添加一个redo undo
        // if (this.shouldAddRedoForPan) {
        //     this.addARedoUndoRecord();
        //     this.shouldAddRedoForPan = false
        // }
        this.addARedoUndoRecord();
        
    }

    beginDrawLine(event) {
        // this.oldState = JSON.parse(JSON.stringify(this.state));//用于重做=
        this.saveCanvasForRedoUndo();
        let pointInfo = this.absorbToLine(event.nativeEvent.locationX, event.nativeEvent.locationY);
        this.startPoint = {x: pointInfo.x, y: pointInfo.y}
        //先把所有编辑状态中的直线取消编辑
        this.cancelEditing()
        this.setState({
            canvas: this.state.canvas
        })
        return
    }

    beginDrawMarks(event) {
        this.saveCanvasForRedoUndo();
        let x = this.addMarkOrigin.x
        let y = this.addMarkOrigin.y
        let point = this.convertPointInViewToSVG(event.nativeEvent.locationX + x, event.nativeEvent.locationY + y)
        this.cancelEditing()
        let mark = {
            id: this.guid(),
            primitive: 'marks',
            origin: {
                x: point.x,
                y: point.y,
                width: 50,
                height: 20
            },
            marks: "Text",
            editing: true,
            visible: true
        }
        let primitives = [...this.state.canvas.primitives, mark]
        this.state.canvas.primitives = primitives
        this.setState({
            canvas: this.state.canvas
        })
    }

    drawingMarks(event) {
        let x = this.addMarkOrigin.x
        let y = this.addMarkOrigin.y
        if (Platform.OS === 'android') {
            let realX = event.nativeEvent.locationX;
            let realY = event.nativeEvent.locationY;
            if (realX >= 0 && realX <= this.addMarkOrigin.width && realY >= 0 && realY <= this.addMarkOrigin.height) {
                realX = event.nativeEvent.locationX + x;
                realY = event.nativeEvent.locationY + y;
            }
            let point = this.convertPointInViewToSVG(realX, realY)
            let editingMark = this.state.canvas.primitives.find(p=>{
                return p.primitive == "marks" && p.editing && p.visible
            })
            editingMark.origin = {...editingMark.origin, ...point}
            this.setState({
                canvas: this.state.canvas
            })
        } else {
            let realX = event.nativeEvent.locationX + x;
            let realY = event.nativeEvent.locationY + y;
            let point = this.convertPointInViewToSVG(realX, realY)
            let editingMark = this.state.canvas.primitives.find(p=>{
                return p.primitive == "marks" && p.editing && p.visible
            })
            editingMark.origin = {...editingMark.origin, ...point}
            this.setState({
                canvas: this.state.canvas
            })
        }
    }

    endDrawMarks(event) {
        this.setState({
            drawingPrimitiveType: ""
        },()=>{
            this.addARedoUndoRecord()
        })
    }

    drawALine(startPoint, endPoint, editing) {
        let x1 =  startPoint.x
        let y1 = startPoint.y
        let x2 = endPoint.x
        let y2 =  endPoint.y
        let linePrimitive1 = {
            id: 'aux1',
            primitive: 'line',
            points: [{x: this.state.canvas.viewPortX-10, y: endPoint.y}, {x: this.state.canvas.viewPortX + this.state.canvas.width + 10, y: endPoint.y}]
        }//横线
        let linePrimitive2 = {
            id: 'aux2',
            primitive: 'line',
            points: [{x: endPoint.x, y: this.state.canvas.viewPortY-10}, {x: endPoint.x, y: this.state.canvas.viewPortY + this.state.canvas.height + 10}],
        }//横线
        let drafts = this.state.canvas.primitives.filter(primitive=>{
            return primitive.draft
        })
        if (drafts.length > 0) {
            let lastDraft = drafts[drafts.length - 1];
            lastDraft.points = [{x: x1, y: y1}, {x: x2, y: y2}]
            this.setState({
                canvas: this.state.canvas,
                auxiliary: [linePrimitive1, linePrimitive2]
            })
        } else {
            //没有草稿，那么要追加一条草稿
            let linePrimitive = {
                id: this.guid(),
                primitive: 'line',
                points: [{x: x1, y: y1}, {x: x2, y: y2}],
                draft: true,
                editing: true
            }
            let primitives = [...this.state.canvas.primitives]
            primitives.push(linePrimitive)
            this.state.canvas.primitives = primitives
            this.setState({
                canvas: this.state.canvas,
                auxiliary: [linePrimitive1, linePrimitive2]
            })
        }
        return
    }

    drawingLine(event) {
        let endPoint  = this.absorbToLine(event.nativeEvent.locationX, event.nativeEvent.locationY)
        if (endPoint.absorb) {
            this.endPoint = {x: endPoint.x, y: endPoint.y}
        } else {
            //水平垂直吸附
            let angle = Math.atan2(endPoint.y - this.startPoint.y, endPoint.x - this.startPoint.x) * 180 / Math.PI;
            const standardAngles = [0, 90, 180]
            standardAngles.sort((angle1, angle2)=>{
                let d1 = Math.abs(angle1 - Math.abs(angle))
                let d2 = Math.abs(angle2 - Math.abs(angle))
                return d1 - d2
            })
            let closestAngle = standardAngles[0]
            let distance = Math.abs(closestAngle - Math.abs(angle));
            if (distance < 5) {
                //要调整
                if (closestAngle == 0) {
                    this.endPoint = {x: endPoint.x, y: this.startPoint.y}
                } else if (closestAngle == 90) {
                    this.endPoint = {x: this.startPoint.x, y: endPoint.y}
                } else if (closestAngle == 180) {
                    this.endPoint = {x: endPoint.x, y: this.startPoint.y}
                } else if (closestAngle == 270) {
                    this.endPoint = {x: this.startPoint.x, y: endPoint.y}
                } else if (closestAngle == 360) {
                    this.endPoint = {x: endPoint.x, y: this.startPoint.y}
                }
            } else {
                this.endPoint = {x: endPoint.x, y: endPoint.y}
            }
        }
        this.drawALine(this.startPoint, this.endPoint,false)
        return
    }

    endDrawLine(event) {
        // if (event.nativeEvent.translationX == 0 && event.nativeEvent.translationY == 0) {
        //     //此处判定为单击了某处，不做处理
        //     return
        // }
        this.startPoint = null;
        this.endPoint = null;
        let canvas = this.state.canvas
        canvas.primitives.forEach(primitive=>{
            primitive.draft = false
        })
        
        this.setState({
            canvas: canvas,
            auxiliary: [],
            drawingPrimitiveType: ""
        },()=>{
            this.addARedoUndoRecord()
        })
    }

    //开始绘制任意曲线
    beginDrawCurve(event) {
        this.saveCanvasForRedoUndo();
        let pointInfo = this.absorbToLine(event.nativeEvent.locationX, event.nativeEvent.locationY);
        this.startPoint = {x: pointInfo.x, y: pointInfo.y}
        //先把所有编辑状态中的直线取消编辑
        this.cancelEditing()
        let newCurve = {
            id: this.guid(),
            primitive: "curve",
            editing: true,
            points: [this.startPoint]
        }
        let primitives = [...this.state.canvas.primitives, newCurve]
        this.state.canvas.primitives = primitives
        this.setState({
            canvas: this.state.canvas
        })
        return
    }

    //绘制任意曲线中
    drawingCurve(event) {
        let point  = this.convertPointInViewToSVG(event.nativeEvent.locationX, event.nativeEvent.locationY)
        let curve = this.state.canvas.primitives.find(primitive=>{
            return primitive.primitive == "curve" && primitive.editing
        })
        let points = curve.points
        curve.points = [...points, {x: point.x, y: point.y}]
        this.setState({
            canvas: this.state.canvas
        })
        return
    }

    //结束绘制任意曲线
    endDrawCurve(event) {
        this.startPoint = null;
        this.endPoint = null;
        let canvas = this.state.canvas
        let curve = canvas.primitives.find(primitive=>{
            return primitive.editing && primitive.primitive == "curve"
        })
        let points = this.simplifyPath(curve.points, 20);
        //遍历顶点，将距离较近的顶点合并为1个
        let mindistances = []
        for (let index = 0; index < points.length; index++) {
            const element = points[index];
            let mindistance = points.map((d, idx)=>{
                let distance = (d.x - element.x) * (d.x - element.x) + (d.y - element.y) * (d.y - element.y)
                return {
                    distance: distance,
                    curIdx: index,
                    index: idx
                }
            }).filter((d, idx)=>{
                return idx != index
            })
            .sort((d1, d2)=>{
                return d1.distance - d2.distance
            })[0]
            mindistances.push(mindistance)
        }
        let pts = []
        for (let index = 0; index < mindistances.length; index++) {
            const info = mindistances[index];
            const distance = info.distance
            if (distance < this.absorbDistance) {
                let pt = pts.find(pt=>{
                    return pt.curIdx == info.index
                })
                if (pt == undefined) {
                    pts.push(info)
                }
            } else {
                pts.push(info)
            }
        }
        points = pts.map(pt=>{
            return points[pt.curIdx]
        })
        let lines = []
        for (let index = 0; index < points.length; index++) {
            const point = points[index];
            let nextPoint;
            if (index < points.length - 1) {
                nextPoint = points[index + 1]
            } else {
                nextPoint = points[0]
            }
            let line = {
                id: this.guid(),
                primitive: "line",
                points: [point, nextPoint],
                editing: false
            }
            lines.push(line)
        }
        this.state.canvas.primitives = [...this.state.canvas.primitives, ...lines]
        canvas.primitives.forEach(primitive=>{
            primitive.draft = false
            primitive.editing = false
        })
        canvas.primitives = canvas.primitives.filter(primitive=>{
            return primitive.primitive != "curve"
        })
        this.setState({
            canvas: canvas,
            auxiliary: [],
            drawingPrimitiveType: ""
        },()=>{
            this.addARedoUndoRecord()
        })
    }

    beginDrawPolygon(event){
        this.saveCanvasForRedoUndo();
        let pointInfo = this.absorbToLine(event.nativeEvent.locationX, event.nativeEvent.locationY);
        this.startPoint = {x: pointInfo.x, y: pointInfo.y}
        //先把所有编辑状态中的直线取消编辑
        this.cancelEditing()
        this.setState({
            canvas: this.state.canvas
        })
        return
    }

    getInscribedPolygonVertices(point1, point2, n) {
        if (n < 3) {
            throw new Error("多边形至少需要3条边");
        }
        // 1. 确定矩形的四个顶点
        const minX = Math.min(point1.x, point2.x);
        const maxX = Math.max(point1.x, point2.x);
        const minY = Math.min(point1.y, point2.y);
        const maxY = Math.max(point1.y, point2.y);
        if (minX == maxX || minY == maxY) {
            return [point1, point2]
        }
        const topLeft = { x: minX, y: minY };
        const topRight = { x: maxX, y: minY };
        const bottomRight = { x: maxX, y: maxY };
        const bottomLeft = { x: minX, y: maxY };
        const edges = [
            { start: topLeft, end: topRight },
            { start: topRight, end: bottomRight },
            { start: bottomRight, end: bottomLeft },
            { start: bottomLeft, end: topLeft }
        ];
        const edgeLengths = edges.map(edge => {
            const dx = edge.end.x - edge.start.x;
            const dy = edge.end.y - edge.start.y;
            return Math.sqrt(dx * dx + dy * dy);
        });
        if (edgeLengths.filter(l=>{ return l > 0}).length == 0) {
            return []
        }
    
        const perimeter = edgeLengths.reduce((acc, length) => acc + length, 0);
        // 3. 计算每个顶点之间的间距
        const step = perimeter / n;
        // 4. 遍历边，按间距放置顶点
        const vertices = [];
        let distanceCovered = 0;
        let currentEdgeIndex = 0;
        let distanceOnCurrentEdge = 0;
    
        for (let i = 0; i < n; i++) {
            const targetDistance = i * step;
            // 找到当前目标距离所在的边
            while (currentEdgeIndex < edges.length && targetDistance > (distanceCovered + edgeLengths[currentEdgeIndex])) {
                distanceCovered += edgeLengths[currentEdgeIndex];
                currentEdgeIndex++;
            }
    
            if (currentEdgeIndex >= edges.length) {
                // 如果超出边界，回到第一条边
                currentEdgeIndex = 0;
                distanceCovered = 0;
            }
    
            distanceOnCurrentEdge = targetDistance - distanceCovered;
            const currentEdge = edges[currentEdgeIndex];
            const edgeLength = edgeLengths[currentEdgeIndex];
    
            const ratio = distanceOnCurrentEdge / edgeLength;
            const vertexX = currentEdge.start.x + ratio * (currentEdge.end.x - currentEdge.start.x);
            const vertexY = currentEdge.start.y + ratio * (currentEdge.end.y - currentEdge.start.y);
    
            vertices.push({ x: vertexX, y: vertexY });
        }
        return vertices;
    }

    getPolygonVertices(centerX, centerY, radius, sides) {
        const vertices = [];
        const angleOffset = sides % 2 == 0 ? Math.PI / sides : Math.PI / sides / 2;
        for (let i = 0; i < sides; i++) {
            const angle = (2 * Math.PI * i) / sides + angleOffset;
            const x = centerX + radius * Math.cos(angle);
            const y = centerY + radius * Math.sin(angle);
            vertices.push({ x, y });
        }
        return vertices;
    }

        //绘制一个多边形
        drawAPolygon(startPoint, endPoint, draft, editing,n){
            let x1 = Math.min(startPoint.x, endPoint.x)
            let y1 = Math.min(startPoint.y, endPoint.y)
            let x2 = Math.max(startPoint.x, endPoint.x)
            let y2 = Math.max(startPoint.y, endPoint.y)
            let rad2 = (x1 - x2) * (x1 - x2) + (y1 - y2) * (y1 - y2)
            let radius = Math.sqrt(rad2)
            let points;
            if (n == 3) {
                let t1x = (x1 + x2) / 2
                points = [{x: t1x, y: y1},{x: x1, y: y2},{x: x2, y: y2}]
            }
            else if (n == 4) {
                //单独计算，因为4边形默认
                points = [
                    {x: x1, y: y1},
                    {x: x2, y: y1},
                    {x: x2, y: y2},
                    {x: x1, y: y2},
                ];
            } else if (n == 41) {
                //平行四边形
                let delta = (x2 - x1) * 0.2
                points = [
                    {x: x1 + delta, y: y1},
                    {x: x2, y: y1},
                    {x: x2 - delta, y: y2},
                    {x: x1, y: y2},
                ];
            } else if (n == 42) {
                //上短下长四边形
                let delta = (x2 - x1) * 0.2
                points = [
                    {x: x1 + delta, y: y1},
                    {x: x2 - delta, y: y1},
                    {x: x2, y: y2},
                    {x: x1, y: y2},
                ];
            } else if (n == 43) {
                //菱形
                points = [
                    {x: (x1 + x2) / 2, y: y1},
                    {x: x2, y: (y1 + y2) / 2},
                    {x: (x1 + x2) / 2, y: y2},
                    {x: x1, y: (y1 + y2) / 2},
                ];
            } else if (n == 5) {
                points = [
                    {x: (x1 + x2) / 2, y: y1},
                    {x: x2, y: (y1 + y2) / 2},
                    {x: (x1 + x2) / 2 + (x2 - x1) / 4, y: y2},
                    {x: (x1 + x2) / 2 - (x2 - x1) / 4, y: y2},
                    {x: x1, y: (y1 + y2) / 2},
                ];
            } 
            else {
                function calculateInscribedPolygonFromEllipse(x1, y1, x2, y2, numVertices) {
                    // 椭圆的中心
                    const h = (x1 + x2) / 2;
                    const k = (y1 + y2) / 2;
                
                    // 椭圆的长半轴和短半轴
                    const a = Math.abs(x2 - x1) / 2;
                    const b = Math.abs(y2 - y1) / 2;
                
                    const vertices = [];
                    const angleStep = (2 * Math.PI) / numVertices;
                
                    for (let i = 0; i < numVertices; i++) {
                        const theta = i * angleStep; // 当前角度
                        const x = h + a * Math.cos(theta); // 椭圆的 x 坐标
                        const y = k + b * Math.sin(theta); // 椭圆的 y 坐标
                        vertices.push({ x, y });
                    }
                
                    return vertices;
                }
                points = calculateInscribedPolygonFromEllipse(x1,y1, x2, y2, n);
            }
            let linePrimitive1 = {
                id: 'aux1',
                primitive: 'line',
                points: [{x: this.state.canvas.viewPortX-10, y: endPoint.y}, {x: this.state.canvas.viewPortX + this.state.canvas.width + 10, y: endPoint.y}]
            }//横线
            let linePrimitive2 = {
                id: 'aux2',
                primitive: 'line',
                points: [{x: endPoint.x, y: this.state.canvas.viewPortY-10}, {x: endPoint.x, y: this.state.canvas.viewPortY + this.state.canvas.height + 10}],
            }//横线
            let aux = []
            // if (n == 4) {
            //     aux = [linePrimitive1, linePrimitive2]
            // }
            let primitives = this.state.canvas.primitives.filter(primitive=>{
                return !primitive.draft
            })
            let newlines = []
            let id = this.guid()
            for (let index = 0; index < points.length; index++) {
                const point = points[index];
                let nextPoint;
                if (index < points.length - 1) {
                    nextPoint = points[index + 1]
                } else {
                    nextPoint = points[0]
                }
                let linePrimitive = {
                    id: id + index,
                    primitive: 'line',
                    points: [point, nextPoint],
                    draft: draft,
                    editing: editing
                }
                newlines.push(linePrimitive)
            }
            this.state.canvas.primitives = [...primitives, ...newlines]
            this.setState({
                canvas: this.state.canvas,
                auxiliary: aux
            })
            return
        }
    
        drawingPolygon(event) {
        let endPoint  = this.absorbToLine(event.nativeEvent.locationX, event.nativeEvent.locationY)
        if (endPoint.absorb) {
            this.endPoint = {x: endPoint.x, y: endPoint.y}
        } else {
            //水平垂直吸附
            let angle = Math.atan2(endPoint.y - this.startPoint.y, endPoint.x - this.startPoint.x) * 180 / Math.PI;
            const standardAngles = [0, 90, 180]
            standardAngles.sort((angle1, angle2)=>{
                let d1 = Math.abs(angle1 - Math.abs(angle))
                let d2 = Math.abs(angle2 - Math.abs(angle))
                return d1 - d2
            })
            let closestAngle = standardAngles[0]
            let distance = Math.abs(closestAngle - Math.abs(angle));
            if (distance < 5) {
                //要调整
                if (closestAngle == 0) {
                    this.endPoint = {x: endPoint.x, y: this.startPoint.y}
                } else if (closestAngle == 90) {
                    this.endPoint = {x: this.startPoint.x, y: endPoint.y}
                } else if (closestAngle == 180) {
                    this.endPoint = {x: endPoint.x, y: this.startPoint.y}
                } else if (closestAngle == 270) {
                    this.endPoint = {x: this.startPoint.x, y: endPoint.y}
                } else if (closestAngle == 360) {
                    this.endPoint = {x: endPoint.x, y: this.startPoint.y}
                }
            } else {
                this.endPoint = {x: endPoint.x, y: endPoint.y}
            }
        }
        // this.drawALine(this.startPoint, this.endPoint,false)
        let match = this.state.drawingPrimitiveType.match(/\d+/);
        let n = parseInt(match[0], 10);
        this.drawAPolygon(this.startPoint, this.endPoint, true, true, n)
        return
        }
    
        //结束多边形绘制
        endDrawPolygon(event) {
            this.startPoint = null;
            this.endPoint = null;
            this.pointsBeforMove = [];
            let canvas = this.state.canvas
            canvas.primitives.forEach(primitive=>{
                primitive.draft = false
            })
            this.setState({
                canvas: this.state.canvas,
                drawingPrimitiveType: "",
                auxiliary: []
            },()=>{
                this.addARedoUndoRecord()
            })
        }

            //判断一个坐标是否足够贴近画布上的某个图形的点，是的话返回图形的点，否的话返回原坐标
    //目前仅实现了吸附到直线端点的功能
    //ok
    getPrimitiveAt(x,y) {
        //支持直线吸附
        //支持多边形吸附
        //直线 marks大标签 门 窗
        //角度因为不需要支持拖动，可以直接添加onPress事件，因此这里不将角度添加进来
        let primitives = [...this.state.canvas.primitives].reverse()//逆序 从上到下
        let position = this.convertPointInViewToSVG(x, y)
        for (let index = 0; index < primitives.length; index++) {
            const primitive = primitives[index];
            if (primitive.primitive == 'line') {
                //点击的是一条直线，因为直线上还有门，窗，标注这些，所以需要额外逻辑
                //先判断该条直线上有没有门，窗，标注
                if (primitive.windows) {
                    for (let index = 0; index < primitive.windows.length; index++) {
                        const window = primitive.windows[index];
                        let centerx = window.x + window.width / 2
                        let centery = window.y + window.height / 2
                        let r = window.width * window.width + window.height * window.height
                        let distance = (centerx - position.x) * (centerx - position.x) + (centery - position.y) * (centery - position.y)
                        if (distance <= r) {
                            return {
                                primitive: primitive,
                                subprimitive: {
                                    window: window
                                }
                            }
                        }
                    }
                }
                if (primitive.doors) {
                    //会旋转，之间判断点击是否在
                    // state: 2, //0 左门朝下 1左门朝上 2右门朝上 3右门朝下
                    for (let index = 0; index < primitive.doors.length; index++) {
                        const door = primitive.doors[index];
                        let distance = (position.x - door.origin.x) * (position.x - door.origin.x) + (position.y - door.origin.y) * (position.y - door.origin.y)
                        if (distance <= this.doorSize * this.doorSize) {
                            return {
                                primitive: primitive,
                                subprimitive: {
                                    door: door
                                }
                            }
                        }
                    }
                }
                if (primitive.marks) {
                    //直线会旋转，这里直接判断距离中心的距离
                    if (primitive.thirdPoint) {
                        let x = primitive.thirdPoint.x
                        let y = primitive.thirdPoint.y
                        let distance = (position.x - x) * (position.x - x) + (position.y - y) * (position.y - y)
                        if (distance < 625) {
                            return {
                                primitive: primitive,
                                subprimitive: {
                                    marks: primitive.marks
                                }
                            }
                        }
                    } else {
                    let middlex = (primitive.points[0].x + primitive.points[1].x) / 2
                    let middley = (primitive.points[0].y + primitive.points[1].y) / 2
                    let max = primitive.marks.width > primitive.marks.height ? primitive.marks.width : primitive.marks.height
                    let distance = (position.x - middlex) * (position.x - middlex) + (position.y - middley) * (position.y - middley)
                    if (distance <= max * max) {
                        return {
                            primitive: primitive,
                            subprimitive: {
                                marks: primitive.marks
                            }
                        }
                    }
                    }
                }
                let point0 = this.convertSVGPointToScreen(primitive.points[0].x, primitive.points[0].y)
                let point1 = this.convertSVGPointToScreen(primitive.points[1].x, primitive.points[1].y)
                if (!primitive.thirdPoint) {
                    let distance = distanceToLine({x: x, y: y}, point0, point1)
                    if (distance <= Math.sqrt(this.absorbDistance)) {
                        return {
                            primitive: primitive
                        }
                    }
                }
            } else if (primitive.primitive == 'marks') {
                //判断点击范围是否在marks内
                let origin = primitive.origin
                let minx = origin.x
                let maxx = origin.x + origin.width
                let miny = origin.y
                let maxy = origin.y + origin.height
                if (position.x >= minx && position.x <= maxx && position.y >= miny && position.y <= maxy) {
                    //选中了大mark
                    return {
                        primitive: primitive
                    }
                }
            } else if (primitive.primitive == 'angle' ) {
                //如果是角度
                console.log("angle!!!")
                let line1 = this.state.canvas.primitives.find(d=>{return d.id == primitive.line1id})
                let line2 = this.state.canvas.primitives.find(d=>{return d.id == primitive.line2id})
                let firstPointMeet = (line1.points[0].x == line2.points[0].x && line1.points[0].y == line2.points[0].y) || (line1.points[0].x == line2.points[1].x && line1.points[0].y == line2.points[1].y)
                let center;
                let firstMeetIndex;
                let secondMeetIndex;
                if (firstPointMeet) {
                    center = line1.points[0]
                    firstMeetIndex = 0
                    if ((line1.points[0].x == line2.points[0].x && line1.points[0].y == line2.points[0].y)) {
                        secondMeetIndex = 0
                    } else {
                        secondMeetIndex = 1
                    }
                } else {
                    center = line1.points[1]
                    firstMeetIndex = 1
                    if ((line1.points[1].x == line2.points[0].x && line1.points[1].y == line2.points[0].y)) {
                        secondMeetIndex = 0
                    } else {
                        secondMeetIndex = 1
                    }
                }
                let line1begin = line1.points[firstMeetIndex]// = line1.points[0]//line1.points[1].x > line1.points[0].x ? line1.points[0] : line1.points[1]
                let line1end = line1.points[1-firstMeetIndex]
                let line2begin = line2.points[secondMeetIndex]// = line2.points[0]//line2.points[1].x > line2.points[0].x ? line2.points[0] : line2.points[1]
                let line2end = line2.points[1-secondMeetIndex]// = line2.points[1]//line2.points[1].x > line2.points[0].x ? line2.points[1] : line2.points[0]
                const angle1 = Math.atan2(line1end.y - line1begin.y, line1end.x - line1begin.x);
                const angle2 = Math.atan2(line2end.y - line2begin.y, line2end.x - line2begin.x);
                const angle3 = Math.atan2(position.y - center.y, position.x - center.x)
                let delta = (angle3 - angle2) * (angle3 - angle1)
                let distance = (position.x - center.x) * (position.x - center.x) + (position.y - center.y) * (position.y - center.y)
                if (delta < 0 && distance < (this.angleLength + 15) * (this.angleLength + 15)) {
                    return {
                        primitive: primitive
                    }
                }
            }
        }
        return null;
    }

        //将屏幕坐标转换为SVG画布坐标
        convertPointInViewToSVG(x, y) {
            let svgWidth = this.state.canvas.width;
            let svgHeight = this.state.canvas.height;
            let scaleX = this.state.canvas.viewPortWidth / svgWidth;
            let scaleY = this.state.canvas.viewPortHeight / svgHeight;
            let convertedX = this.state.canvas.viewPortX + x * scaleX
            let convertedY = this.state.canvas.viewPortY + y * scaleY
            return {x: convertedX, y: convertedY}
        }
    
        //将SVG画布坐标转换为屏幕坐标
        convertSVGPointToScreen(x, y) {
            let svgWidth = this.state.canvas.width;
            let svgHeight = this.state.canvas.height;
            let scaleX = svgWidth / this.state.canvas.viewPortWidth;//this.viewPortWidth / svgWidth;
            let scaleY = svgHeight / this.state.canvas.viewPortHeight; //this.viewPortHeight / svgHeight;
            let convertedX = (x - this.state.canvas.viewPortX) * scaleX
            let convertedY = (y - this.state.canvas.viewPortY) * scaleY
            return {x: convertedX, y: convertedY}
        }

    //点击了某个图形
    onClickPrimitive(p){
        let primitive = this.state.canvas.primitives.find(pp=>{
            return pp.id == p.primitive.id
        })//p.primitive
        let subprimitive = p.subprimitive
        if (subprimitive == undefined) {
            //没有子组件的
            if (primitive.editing) {
                if (primitive.window?.editing || primitive.door?.editing) {
                    this.saveCanvasForRedoUndo()
                    this.cancelEditing()
                    primitive.editing = true
                    let resortedprimitives = this.state.canvas.primitives.sort((a, b)=>{
                        if (a.editing === b.editing) {
                            return 0
                        }
                        return a.editing ? 1 : -1
                    })
                    this.state.canvas.primitives = resortedprimitives
                    this.setState({
                        canvas: this.state.canvas
                    },()=>{
                        this.addARedoUndoRecord()
                    })
                }
                return
            } else {
                if (this.state.drawingPrimitiveType == "angle") {
                    let choosedLines = this.state.canvas.primitives.filter(primitive=>{
                        return primitive.editing && primitive.primitive == 'line' && primitive.thirdPoint == undefined
                    })
                    if (choosedLines.length == 0) {
                        //直接选中
                        this.saveCanvasForRedoUndo();
                        primitive.editing = true
                        let resortedprimitives = this.state.canvas.primitives.sort((a, b)=>{
                            if (a.editing === b.editing) {
                                return 0
                            }
                            return a.editing ? 1 : -1
                        })
                        this.state.canvas.primitives = resortedprimitives
                        this.setState({
                            canvas: this.state.canvas
                        },()=>{
                            this.addARedoUndoRecord()
                        })
                    } else if (choosedLines.length == 1) {
                        //有一条选中,判断是不是同一条线，是的话取消选中状态
                        this.saveCanvasForRedoUndo();
                        let choosedLine = choosedLines[0]
                        if (choosedLine.id == primitive.id) {
                            //选中了同一条线，不做逻辑
                            return
                        } else {
                            let firstPointMeet = (choosedLine.points[0].x == primitive.points[0].x && choosedLine.points[0].y == primitive.points[0].y) || (choosedLine.points[0].x == primitive.points[1].x && choosedLine.points[0].y == primitive.points[1].y)
                            let secondPointMeet = (choosedLine.points[1].x == primitive.points[0].x && choosedLine.points[1].y == primitive.points[0].y) || (choosedLine.points[1].x == primitive.points[1].x && choosedLine.points[1].y == primitive.points[1].y)
                            let endAbsorbed = firstPointMeet || secondPointMeet
                            primitive.editing = true
                            let resortedprimitives = this.state.canvas.primitives.sort((a, b)=>{
                                if (a.editing === b.editing) {
                                    return 0
                                }
                                return a.editing ? 1 : -1
                            })
                            this.state.canvas.primitives = resortedprimitives
                            if (endAbsorbed) {
                                //如果有顶点相交,弹出角度标定弹框
                                this.setState({
                                    anglevisible: true,
                                    angle: "",
                                    canvas: this.state.canvas
                                })
                            } else {
                                //如果没有,将老的选中线段取消选中
                                choosedLine.editing = false
                                let resortedprimitives = this.state.canvas.primitives.sort((a, b)=>{
                                    if (a.editing === b.editing) {
                                        return 0
                                    }
                                    return a.editing ? 1 : -1
                                })
                                this.state.canvas.primitives = resortedprimitives
                                this.setState({
                                    canvas: this.state.canvas
                                },()=>{
                                    this.addARedoUndoRecord()
                                })
                            }
                        }
                    } else {
                        //
                        console.log('大于1条线段被选中')
                    }
                    return
                } else {
                    //选中该图形
                    this.saveCanvasForRedoUndo()
                    this.cancelEditing()
                    primitive.editing = true
                    let resortedprimitives = this.state.canvas.primitives.sort((a, b)=>{
                        if (a.editing === b.editing) {
                            return 0
                        }
                        return a.editing ? 1 : -1
                    })
                    this.state.canvas.primitives = resortedprimitives
                    this.setState({
                        canvas: this.state.canvas
                    },()=>{
                        this.addARedoUndoRecord()
                    })
                }
            }
            return
        } else {
            //点中了子组件的。只有直线有子组件
            if (subprimitive.window) {
                if (subprimitive.window.editing) {
                    return
                }
                this.saveCanvasForRedoUndo()
                this.cancelEditing()
                if (primitive.doors) {
                    primitive.doors.forEach(door=>{
                        door.editing = false
                    })
                }
                primitive.editing = true
                subprimitive.window.editing = true
                let resortedprimitives = this.state.canvas.primitives.sort((a, b)=>{
                    if (a.editing === b.editing) {
                        return 0
                    }
                    return a.editing ? 1 : -1
                })
                this.state.canvas.primitives = resortedprimitives
                // primitive.editing = false
                this.setState({
                    canvas: this.state.canvas
                },()=>{
                    this.addARedoUndoRecord()
                })
            } else if (subprimitive.door) {
                //点中了门
                //这里应该弹出门编辑界面
                if (subprimitive.door.editing) {
                    return
                }
                this.saveCanvasForRedoUndo()
                this.cancelEditing()
                if (primitive.windows) {
                    primitive.windows.forEach(window=>{
                        window.editing = false
                    })
                }
                subprimitive.door.editing = true
                primitive.editing = true
                let resortedprimitives = this.state.canvas.primitives.sort((a, b)=>{
                    if (a.editing === b.editing) {
                        return 0
                    }
                    return a.editing ? 1 : -1
                })
                this.state.canvas.primitives = resortedprimitives
                this.setState({
                    canvas: this.state.canvas
                },()=>{
                    this.addARedoUndoRecord()
                })
            }
            if (!primitive.editing) {
                this.saveCanvasForRedoUndo()
                this.state.canvas.primitives.forEach(p=>{
                    return p.editing = false
                })
                primitive.editing = true
                if (primitive.windows) {
                    primitive.windows.forEach(window=>{
                        window.editing = false
                    })
                }
                if (primitive.doors) {
                    primitive.doors.forEach(door=>{
                        door.editing = false
                    })
                }
                let resortedprimitives = this.state.canvas.primitives.sort((a, b)=>{
                    if (a.editing === b.editing) {
                        return 0
                    }
                    return a.editing ? 1 : -1
                })
                this.state.canvas.primitives = resortedprimitives
                this.setState({
                    canvas: this.state.canvas
                },()=>{
                    this.addARedoUndoRecord()
                })
            }
            return
        }
    }

    //选中了门
    doorClicked(primitive) {
        //弹出配置项，配置方向
        if (primitive.door?.editing) {
            return
        }
        this.saveCanvasForRedoUndo()
        this.state.canvas.primitives.forEach(d=>{
            d.door.editing = false
        })
        primitive.door.editing = true
        this.setState({
            canvas: this.state.canvas
        },()=>{
            this.addARedoUndoRecord();
        })
    }

    generateDoor(primitive) {
        let doors = primitive.doors
        if (doors == undefined || primitive.thirdPoint) {
            return null
        }

        let results = doors.map((door, index)=>{
        let pathData;
        let x1 = primitive.points[0].x
        let y1 = primitive.points[0].y
        let x2 = primitive.points[1].x
        let y2 = primitive.points[1].y
        let angle;
        let doorState = door.state;
        let doorOrigin = door.origin;
        let linex1;
        let liney1;
        let linex2;
        let liney2;
        const shouldSetResponder = (event) => {
            console.log("should set responder")
            this.currentResponder = primitive;
            return true
        }
        const onGrant = (event) => {
            this.saveCanvasForRedoUndo();
            this.initialDoorLocation = {
                x: door.origin.x,
                y: door.origin.y
            }
            this.initialClickPoint = this.convertPointInViewToSVG(event.nativeEvent.locationX, event.nativeEvent.locationY);
        }

        const onMoving = (event) => {
            let point1 = primitive.points[0];
            let point2 = primitive.points[1];
            // console.log("point1.x is " + point1.x)
            let nowLocation = this.convertPointInViewToSVG(event.nativeEvent.locationX, event.nativeEvent.locationY);
            let scale = this.state.canvas.viewPortWidth / this.state.canvas.width
            let dx = (nowLocation.x - this.initialClickPoint.x)
            let dy = (nowLocation.y - this.initialClickPoint.y)
            // console.log("window is ")
            // console.log(window)
            let y;
            let x;
            if (x1 == x2) {
                //垂线，单独处理
                // window.y += dy
                y = this.initialDoorLocation.y + dy
                x = door.origin.x
            } else if (y1 == y2) {
                //横线
                // window.x += dx
                x = this.initialDoorLocation.x + dx
                y = door.origin.y
            } else {
                //有斜率
                let k;
                if (x2 > x1) {
                    k = (y2 - y1) / ( x2 - x1)
                } else {
                    k = (y1 - y2) / (x1 - x2)
                }
                let yy = dx * k
                x = this.initialDoorLocation.x + dx
                y = this.initialDoorLocation.y + yy
            }
            // console.log("x is " + x + " y is " + y)
            let miny = point1.y < point2.y ? point1.y : point2.y
            let maxy = point1.y > point2.y ? point1.y : point2.y
            let minx = point1.x < point2.x ? point1.x : point2.x
            let maxx = point1.x > point2.x ? point1.x : point2.x
            if (y >= (miny) && y <= (maxy) && x >= (minx) && x <= (maxx)) {
                door.origin.y = y;
                door.origin.x = x;
            }
            this.setState({
                canvas: this.state.canvas
            })
        }

        const onMoveEnd = (event) => {
            this.currentResponder = null;
            this.addARedoUndoRecord()
        }
        // let x1 = primitive.points[0].x
        // let y1 = primitive.points[0].y
        // let x2 = primitive.points[1].x
        // let y2 = primitive.points[1].y
        // let controlPoint = {
        //     x: 11,//primitive.window.width / 2,
        //     y: 22 + 5
        // }
        // let controlPoint = {
        //     x: 11, y: 27
        // }
        let mark = (controlPoint)=>{
            if ((!door.l || door.l.length == 0) && (!door.h || door.h.length == 0)) {
                return null
            }
            let anglesize = 5
        let corner = 8
        let halfline = 20
        let lineheight = 20
        let path = `
        M ${controlPoint.x} ${controlPoint.y}
        L ${controlPoint.x - anglesize} ${controlPoint.y + anglesize}
        M ${controlPoint.x} ${controlPoint.y}
        L ${controlPoint.x + anglesize} ${controlPoint.y + anglesize}
        L ${controlPoint.x + anglesize + halfline} ${controlPoint.y + anglesize}
        A ${corner} ${corner} 0 0 1 ${controlPoint.x + anglesize + halfline + corner} ${controlPoint.y + anglesize + corner}
        L ${controlPoint.x + anglesize + halfline + corner} ${controlPoint.y + anglesize + corner + lineheight}
        A ${corner} ${corner} 0 0 1 ${controlPoint.x + anglesize + halfline} ${controlPoint.y + anglesize + corner + lineheight + corner}
        L ${controlPoint.x - anglesize - halfline} ${controlPoint.y + anglesize + corner + lineheight + corner}
        A ${corner} ${corner} 0 0 1 ${controlPoint.x - anglesize - halfline - corner} ${controlPoint.y + anglesize + corner + lineheight}
        L ${controlPoint.x - anglesize - halfline - corner} ${controlPoint.y + anglesize + corner}
        A ${corner} ${corner} 0 0 1 ${controlPoint.x - anglesize - halfline} ${controlPoint.y + anglesize}
        L ${controlPoint.x - anglesize} ${controlPoint.y + anglesize}
        `
            return <G key={index.toString()}>
            <Path d={path} stroke={'white'} strokeWidth={this.lineWidth} fill={'none'}/>
            <SVGText
                x={controlPoint.x}
                y={controlPoint.y + lineheight - 2}
                fontSize="12"
                fill="white"
                textAnchor="middle"
                alignmentBaseline="middle"
            >
      {door.l}
    </SVGText>
    <SVGText
                x={controlPoint.x}
                y={controlPoint.y + lineheight + 12 + 1}
                fontSize="12"
                fill="white"
                textAnchor="middle"
                alignmentBaseline="middle"
            >
      {door.h}
    </SVGText>
        </G>
        }
        if (doorState == 0) {
            linex1 = 0
            liney1 = 0
            linex2 = 0
            liney2 = this.doorSize
            if (x2 > x1) {
                angle = Math.atan2(y2 - y1, x2 -x1) * 180 / Math.PI;
            } else {
                angle = Math.atan2(y1 - y2, x1 -x2) * 180 / Math.PI;
            }
            const startAngle = 0; // 起始角度
        const endAngle = Math.PI / 2; // 结束角度
        const radius = this.doorSize; // 半径
        const centerX = this.lineWidth + 1; // 圆心X坐标
        const centerY = 0; // 圆心Y坐标
        const x11 = centerX + radius * Math.cos(startAngle);
        const y11 = centerY + radius * Math.sin(startAngle);
        const x22 = centerX + radius * Math.cos(endAngle);
        const y22 = centerY + radius * Math.sin(endAngle);
        pathData = `M ${x11} ${y11} A ${radius} ${radius} 0 0 1 ${x22} ${y22}`;
        let points = `${linex1},${liney1} ${x11},${y11} ${x22},${y22}`
        let controlPoint = {
            x: centerX + (radius + 10) * Math.cos(endAngle),
            y: centerY + (radius + 10) * Math.sin(endAngle)
        }
        return <G key={index.toString()} onMoveShouldSetResponder={shouldSetResponder} onResponderMove={onMoving} onResponderGrant={onGrant} onResponderEnd={onMoveEnd} x={doorOrigin.x} y={doorOrigin.y} width={this.doorSize} height={this.doorSize} rotation={angle}>
                    <Polygon points={points} fill={'none'}/>
                    <Line x1={linex1} y1={liney1} x2={linex2} y2={liney2} stroke={door.editing ? '#1DFF58' : 'white'} strokeWidth={this.lineWidth}/>
                    <Path d={pathData} stroke={door.editing ? '#1DFF58' : 'white'} strokeWidth={this.lineWidth} fill={'none'}/>
                    {mark(controlPoint)}
                </G>
        } else if (doorState == 1) {
            linex1 = 0
            liney1 = this.lineWidth
            linex2 = 0
            liney2 = -this.doorSize
            if (x2 > x1) {
                angle = Math.atan2(y2 - y1, x2 -x1) * 180 / Math.PI;
            } else {
                angle = Math.atan2(y1 - y2, x1 -x2) * 180 / Math.PI;
            }
            const startAngle = 0; // 起始角度
            const endAngle = Math.PI / 2; // 结束角度
            const radius = this.doorSize; // 半径
            const centerX = this.lineWidth + 1; // 圆心X坐标
            const centerY = 0; // 圆心Y坐标
            const x11 = centerX + radius * Math.cos(startAngle);
            const y11 = centerY - radius * Math.sin(startAngle);
            const x22 = centerX + radius * Math.cos(endAngle);
            const y22 = centerY - radius * Math.sin(endAngle);
            pathData = `M ${x11} ${y11} A ${radius} ${radius} 0 0 0 ${x22} ${y22}`;
            let points = `${linex1},${liney1} ${x11},${y11} ${x22},${y22}`
            let controlPoint = {
                x: centerX  - 10 * Math.cos(endAngle),
                y: centerY + 10 * Math.sin(endAngle)
            }
            return <G key={index.toString()} onMoveShouldSetResponder={shouldSetResponder} onResponderMove={onMoving} onResponderGrant={onGrant} onResponderEnd={onMoveEnd} x={doorOrigin.x} y={doorOrigin.y} width={this.doorSize} height={this.doorSize} rotation={angle}>
                        <Polygon points={points} fill={'none'}/>
                        <Line x1={linex1} y1={liney1} x2={linex2} y2={liney2} stroke={door.editing ? '#1DFF58' : 'white'} strokeWidth={this.lineWidth}/>
                        <Path d={pathData} stroke={door.editing ? '#1DFF58' : 'white'} strokeWidth={this.lineWidth} fill={'none'}/>
                        {mark(controlPoint)}
                    </G>
        } else if (doorState == 2) {
            linex1 = 0
            liney1 = this.lineWidth
            linex2 = 0
            liney2 = -this.doorSize
            if (x2 > x1) {
                angle = Math.atan2(y2 - y1, x2 -x1) * 180 / Math.PI;
            } else {
                angle = Math.atan2(y1 - y2, x1 -x2) * 180 / Math.PI;
            }
            const startAngle = 0; // 起始角度
            const endAngle = Math.PI / 2; // 结束角度
            const radius = this.doorSize; // 半径
            const centerX = this.lineWidth - 1; // 圆心X坐标
            const centerY = 0; // 圆心Y坐标
            const x11 = centerX - radius * Math.cos(startAngle);
            const y11 = centerY - radius * Math.sin(startAngle);
            const x22 = centerX - radius * Math.cos(endAngle);
            const y22 = centerY - radius * Math.sin(endAngle);
            pathData = `M ${x11} ${y11} A ${radius} ${radius} 0 0 1 ${x22} ${y22}`;
            let points = `${linex1},${liney1} ${x11},${y11} ${x22},${y22}`
            let controlPoint = {
                x: centerX + (10) * Math.cos(endAngle),
                y: centerY + (10) * Math.sin(endAngle)
            }
            return <G key={index.toString()} onMoveShouldSetResponder={shouldSetResponder} onResponderMove={onMoving} onResponderGrant={onGrant} onResponderEnd={onMoveEnd} x={doorOrigin.x} y={doorOrigin.y} width={this.doorSize} height={this.doorSize} rotation={angle}>
                        <Polygon points={points} fill={'none'}/>
                        <Line x1={linex1} y1={liney1} x2={linex2} y2={liney2} stroke={door.editing ? '#1DFF58' : 'white'} strokeWidth={this.lineWidth}/>
                        <Path d={pathData} stroke={door.editing ? '#1DFF58' : 'white'} strokeWidth={this.lineWidth} fill={'none'}/>
                        {mark(controlPoint)}
                    </G>
        } else if (doorState == 3) {
            linex1 = 0
            liney1 = 0
            linex2 = 0
            liney2 = this.doorSize
            if (x2 > x1) {
                angle = Math.atan2(y2 - y1, x2 -x1) * 180 / Math.PI;
            } else {
                angle = Math.atan2(y1 - y2, x1 -x2) * 180 / Math.PI;
            }
            const startAngle = 0; // 起始角度
            const endAngle = Math.PI / 2; // 结束角度
            const radius = this.doorSize; // 半径
            const centerX = this.lineWidth; // 圆心X坐标
            const centerY = 0; // 圆心Y坐标
            const x11 = centerX - radius * Math.cos(startAngle);
            const y11 = centerY + radius * Math.sin(startAngle);
            const x22 = centerX - radius * Math.cos(endAngle);
            const y22 = centerY + radius * Math.sin(endAngle);
            pathData = `M ${x11} ${y11} A ${radius} ${radius} 0 0 0 ${x22} ${y22}`;
            let points = `${linex1},${liney1} ${x11},${y11} ${x22},${y22}`
            let controlPoint = {
                x: centerX - (radius + 10) * Math.cos(endAngle),
                y: centerY + (radius + 10) * Math.sin(endAngle)
            }
            return <G key={index.toString()} onMoveShouldSetResponder={shouldSetResponder} onResponderMove={onMoving} onResponderGrant={onGrant} onResponderEnd={onMoveEnd} x={doorOrigin.x} y={doorOrigin.y} width={this.doorSize} height={this.doorSize} rotation={angle}>
                        <Polygon points={points} fill={'none'}/>
                        <Line x1={linex1} y1={liney1} x2={linex2} y2={liney2} stroke={door.editing ? '#1DFF58' : 'white'} strokeWidth={this.lineWidth}/>
                        <Path d={pathData} stroke={door.editing ? '#1DFF58' : 'white'} strokeWidth={this.lineWidth} fill={'none'}/>
                        {mark(controlPoint)}
                    </G>
        }
        })
        return results
    }

    generateWindow(primitive) {
        if (primitive.windows == undefined || primitive.thirdPoint) {
            return null;
        }
        let windows = primitive.windows.map((window, index)=>{
        let x1 = primitive.points[0].x
        let y1 = primitive.points[0].y
        let x2 = primitive.points[1].x
        let y2 = primitive.points[1].y
        let controlPoint = {
            x: 11,//primitive.window.width / 2,
            y: 22 + 5
        }
        let showmark = false
        if ((window.l && window.l.length > 0) || (window.h && window.h.length > 0)) {
            showmark = true
        }
        let anglesize = 5
        let corner = 8
        let halfline = 20
        let lineheight = 20
        let path = `
        M ${controlPoint.x} ${controlPoint.y}
        L ${controlPoint.x - anglesize} ${controlPoint.y + anglesize}
        M ${controlPoint.x} ${controlPoint.y}
        L ${controlPoint.x + anglesize} ${controlPoint.y + anglesize}
        L ${controlPoint.x + anglesize + halfline} ${controlPoint.y + anglesize}
        A ${corner} ${corner} 0 0 1 ${controlPoint.x + anglesize + halfline + corner} ${controlPoint.y + anglesize + corner}
        L ${controlPoint.x + anglesize + halfline + corner} ${controlPoint.y + anglesize + corner + lineheight}
        A ${corner} ${corner} 0 0 1 ${controlPoint.x + anglesize + halfline} ${controlPoint.y + anglesize + corner + lineheight + corner}
        L ${controlPoint.x - anglesize - halfline} ${controlPoint.y + anglesize + corner + lineheight + corner}
        A ${corner} ${corner} 0 0 1 ${controlPoint.x - anglesize - halfline - corner} ${controlPoint.y + anglesize + corner + lineheight}
        L ${controlPoint.x - anglesize - halfline - corner} ${controlPoint.y + anglesize + corner}
        A ${corner} ${corner} 0 0 1 ${controlPoint.x - anglesize - halfline} ${controlPoint.y + anglesize}
        L ${controlPoint.x - anglesize} ${controlPoint.y + anglesize}
        `
        let angle1// = Math.atan2(y2 - y1, x2 - x1) * 180 / Math.PI;;
        if (x2 > x1) {
            angle1 = Math.atan2(y2 - y1, x2 - x1) * 180 / Math.PI
        } else {
            angle1 = Math.atan2(y1 - y2, x1 - x2) * 180 / Math.PI
        }
        let win = `
        M 4 19
        L 4 10
        A 7 7 0 0 1 18 10
        L 18 19
        L 4 19
        M 11 3
        L 11 19
        M 4 12
        L 18 12
        `
        let rotation = `rotate(${angle1}, 11, 11)`
        let translate = `translate(2.3,2)`
        return <G key={index.toString()} x={window.x} y={window.y} transform={rotation}
        onMoveShouldSetResponder={(event) => {
            this.currentResponder = primitive;
            return true
        }} onResponderGrant={(event)=>{
            this.saveCanvasForRedoUndo();
            this.initialWindowLocation = {
                x: window.x,
                y: window.y
            }
            this.initialClickPoint = this.convertPointInViewToSVG(event.nativeEvent.locationX, event.nativeEvent.locationY);
        }} onResponderMove={(event)=>{
            let point1 = primitive.points[0];
            let point2 = primitive.points[1];
            let nowLocation = this.convertPointInViewToSVG(event.nativeEvent.locationX, event.nativeEvent.locationY);
            let dx = nowLocation.x - this.initialClickPoint.x
            let dy = nowLocation.y - this.initialClickPoint.y
            let wd = window
            let y;
            let x;
            if (x1 == x2) {
                //垂线，单独处理
                // window.y += dy
                y = this.initialWindowLocation.y + dy
                x = wd.x
            } else if (y1 == y2) {
                //横线
                // window.x += dx
                x = this.initialWindowLocation.x + dx
                y = wd.y
            } else {
                //有斜率
                let k;
                if (x2 > x1) {
                    k = (y2 - y1) / ( x2 - x1)
                } else {
                    k = (y1 - y2) / (x1 - x2)
                }
                let yy = dx * k
                x = this.initialWindowLocation.x + dx
                y = this.initialWindowLocation.y + yy
            }
            // console.log("x is " + x + " y is " + y)
            let miny = point1.y < point2.y ? point1.y : point2.y
            let maxy = point1.y > point2.y ? point1.y : point2.y
            let minx = point1.x < point2.x ? point1.x : point2.x
            let maxx = point1.x > point2.x ? point1.x : point2.x
            // console.log("minx is " + minx + " miny is " + miny + " maxx is " + maxx + " maxy is " + maxy)
            if (y >= (miny - wd.height / 2) && y <= (maxy - wd.height / 2) && x >= (minx - wd.width / 2) && x <= (maxx - wd.width / 2)) {
                // console.log("设置了窗口位置")
                wd.y = y;
                wd.x = x;
            }
            this.setState({
                canvas: this.state.canvas
            })
        }} onResponderEnd={(event)=>{
            this.currentResponder = null;
            this.addARedoUndoRecord();
        }}
        >
            <G>
                <Rect fill={"#3D3D3D"} x={0} y={0} width={27} height={27} rx={4} ry={4}/>
                <Path transform={translate} d={win} stroke={window.editing ? "#1DFF58" : "white"} strokeWidth={this.lineWidth}/>
            </G>
            {showmark ? <G>
                <Path d={path} stroke={'white'} strokeWidth={this.lineWidth}/>
                <SVGText
                    x={controlPoint.x}
                    y={controlPoint.y + lineheight - 2}
                    fontSize="12"
                    fill="white"
                    textAnchor="middle"
                    alignmentBaseline="middle"
                >
          {window.l}
        </SVGText>
        <SVGText
                    x={controlPoint.x}
                    y={controlPoint.y + lineheight + 12 + 1}
                    fontSize="12"
                    fill="white"
                    textAnchor="middle"
                    alignmentBaseline="middle"
                >
          {window.h}
        </SVGText>
            </G> : null}
        </G>
        })
        return windows
    }

    generateAngleSVG(primitive) {
        // {id: 3, primitive: 'angle', line1id: 'xx', line2id: '', angle: 60, editing: false}
        let line1 = this.state.canvas.primitives.find(d=>{return d.id == primitive.line1id})
        let line2 = this.state.canvas.primitives.find(d=>{return d.id == primitive.line2id})
        let firstPointMeet = (line1.points[0].x == line2.points[0].x && line1.points[0].y == line2.points[0].y) || (line1.points[0].x == line2.points[1].x && line1.points[0].y == line2.points[1].y)
        let center;
        let firstMeetIndex;
        let secondMeetIndex;
        let scale = this.state.canvas.viewPortWidth / this.state.canvas.viewPortHeight
        if (firstPointMeet) {
            center = line1.points[0]
            firstMeetIndex = 0
            if ((line1.points[0].x == line2.points[0].x && line1.points[0].y == line2.points[0].y)) {
                secondMeetIndex = 0
            } else {
                secondMeetIndex = 1
            }
        } else {
            center = line1.points[1]
            firstMeetIndex = 1
            if ((line1.points[1].x == line2.points[0].x && line1.points[1].y == line2.points[0].y)) {
                secondMeetIndex = 0
            } else {
                secondMeetIndex = 1
            }
        }
        let line1begin = line1.points[firstMeetIndex]// = line1.points[0]//line1.points[1].x > line1.points[0].x ? line1.points[0] : line1.points[1]
        let line1end = line1.points[1-firstMeetIndex]
        let line2begin = line2.points[secondMeetIndex]// = line2.points[0]//line2.points[1].x > line2.points[0].x ? line2.points[0] : line2.points[1]
        let line2end = line2.points[1-secondMeetIndex]// = line2.points[1]//line2.points[1].x > line2.points[0].x ? line2.points[1] : line2.points[0]
        const angle1 = Math.atan2(line1end.y - line1begin.y, line1end.x - line1begin.x);
        const angle2 = Math.atan2(line2end.y - line2begin.y, line2end.x - line2begin.x);
        // const startAngle = angle1 * (180 / Math.PI);
        // const endAngle = angle2 * (180 / Math.PI);
        const largeArcFlag = 0//(endAngle - startAngle) > 180 ? 1 : 0;
        let r = this.angleLength
        const arcStartX = center.x + r * Math.cos(angle1);
        const arcStartY = center.y + r * Math.sin(angle1);
        const arcEndX = center.x + r * Math.cos(angle2);
        const arcEndY = center.y + r * Math.sin(angle2);
        const arcLineCenterX = (arcStartX + arcEndX) / 2
        const arcLineCenterY = (arcEndY + arcStartY) / 2
        let vector = {
            x: arcLineCenterX - center.x,
            y: arcLineCenterY - center.y
        }
        // console.log("vector is ")
        // console.log(vector)
        let arcPath;
        let clockwise;// = arcStartX > arcEndX ? 1 : 0
        if (vector.y <= 0) {
            //朝上开口
            clockwise = arcStartX >= arcEndX ? 0 : 1
        } else {
            clockwise = arcStartX >= arcEndX ? 1 : 0
        }
        let editing = primitive.editing

        arcPath = `
            M ${arcStartX} ${arcStartY}
            A ${r} ${r} 0 ${largeArcFlag} ${clockwise} ${arcEndX} ${arcEndY}
          `;
const arcStartX1 = center.x + (r + 20) * Math.cos(angle1);
        const arcStartY1 = center.y + (r + 20) * Math.sin(angle1);
        const arcEndX1 = center.x + (r + 20) * Math.cos(angle2);
        const arcEndY1 = center.y + (r + 20) * Math.sin(angle2);
let textX = (arcStartX1 + arcEndX1) / 2
let textY = (arcStartY1 + arcEndY1) / 2

  // 计算中线角度
  const midAngle = (angle1 + angle2) / 2;
  const rotation = midAngle * (180 / Math.PI) + 270; // 文字旋转90度
        return <G key={primitive.id}>
            <Path d={arcPath} fill="none" stroke={editing ? "#1DFF58" : "white"} strokeWidth={this.lineWidth * scale} />
            <SVGText
          x={textX}
          y={textY}
          fontSize="12"
          fill={editing ? "#1DFF58" : "white"}
          textAnchor="middle"
          alignmentBaseline="middle"
          transform={`rotate(${rotation}, ${textX}, ${textY})`} // 旋转文本
        >
          {primitive.angle}°
        </SVGText>
        </G>
    }

    //绘制图形的方法
    renderPrimitives(primitives) {
        let reassmbles = primitives.map((primitive, index)=>{
            let type = primitive.primitive;//图形类型
            let editing = primitive.editing//是否正在编辑
            let id = primitive.id;
            let scale = this.state.canvas.viewPortWidth / this.state.canvas.viewPortHeight
            if (type == 'line') {
                let x1 = primitive.points[0].x
                let y1 = primitive.points[0].y
                let x2 = primitive.points[1].x
                let y2 = primitive.points[1].y
                let marks = primitive.marks
                let rectwidth
                let rectheight
                let corner
                let centerx
                let centery
                let angle
                let transform
                let havemark = marks?.text?.length && marks?.visible > 0
                if (havemark) {
                    if (!primitive.thirdPoint) {
                        rectwidth = marks.width + 10
                        rectheight = 20
                            corner = rectheight / 2
                            centerx = (x1 + x2) / 2 - rectwidth / 2
                            centery = (y1 + y2) / 2 - rectheight / 2
                            if (x2 > x1) {
                                angle = Math.atan2(y2 - y1, x2 - x1) * 180 / Math.PI;
                            } else {
                                angle = Math.atan2(y1 - y2, x1 - x2) * 180 / Math.PI;
                            }
                            transform = "translate(" + centerx + ", " + centery + ") " + "rotate(" + angle + ","  + rectwidth / 2 + "," + rectheight / 2 + ")"
                    } else {
                        rectwidth = marks.width + 10
                        rectheight = 20
                        corner = rectheight / 2
                        centerx = primitive.thirdPoint.x
                        centery = primitive.thirdPoint.y
                        if (x2 > x1) {
                            angle = Math.atan2(y2 - y1, x2 - x1) * 180 / Math.PI;
                        } else {
                            angle = Math.atan2(y1 - y2, x1 - x2) * 180 / Math.PI;
                        }
                        centerx = primitive.thirdPoint.x -  rectwidth / 2
                        centery = primitive.thirdPoint.y - rectheight / 2
                        let deltx = x1 - x2
                        let delty = y1 - y2
                        if (deltx * delty > 0) {
                            centerx = primitive.thirdPoint.x -  rectwidth / 2
                            centery = primitive.thirdPoint.y - rectheight / 2 - rectheight
                        } else {
                            centerx = primitive.thirdPoint.x -  rectwidth / 2
                            centery = primitive.thirdPoint.y - rectheight / 2
                        }
                        transform = "translate(" + centerx + ", " + centery + ") " + "rotate(" + angle + ","  + rectwidth / 2 + "," + rectheight / 2 + ")"
                    }
    //                 console.log("rectwidth is " + rectwidth)
    //                 markpath = `
    // M ${corner} ${rectheight}
    // A ${corner} ${corner} 0 0 1 ${corner} 0
    // L ${rectwidth - corner} 0
    // A ${corner} ${corner} 0 0 1 ${rectwidth - corner} ${rectheight}
    // L ${corner} ${rectheight}
    // `
                }
                let subediting = primitive.windows?.find(window=>{return window.editing}) != undefined || primitive.doors?.find(door=>{return door.editing}) != undefined
                let m
                if (primitive.thirdPoint) {
                    let radius = primitive.thirdPoint.radius
                    const largeArcFlag = 0
                    let beginx, beginy, endx, endy;
                    if (x1 < x2) {
                        beginx = x1
                        beginy = y1
                        endx = x2
                        endy = y2
                    } else if (x1 == x2) {
                        if (y1 > y2) {
                            beginx = x1
                            beginy = y1
                            endx = x2
                            endy = y2
                        } else {
                            beginx = x2
                            beginy = y2
                            endx = x1
                            endy = y1
                        }
                    } else {
                        beginx = x2
                        beginy = y2
                        endx = x1
                        endy = y1
                    }
                    let clockwise = primitive.thirdPoint.h < 0 ? 1 : 0
                    m = `
    M ${beginx} ${beginy}
    A ${radius} ${radius} 0 ${largeArcFlag} ${clockwise} ${endx} ${endy}`;
                }
                return <G 
                    key={id}
                    /**onPress={this.onClickPrimitive.bind(this, primitive)}**/
                >
                    <Circle 
                        fill={editing && !subediting ? '#1DFF58' : 'white'}
                        cx={x1}
                        cy={y1}
                        r={this.lineCapRadius * scale}
                    />
                    {primitive.thirdPoint ?
                    <G>
                        <Path fill={'none'} d={m} stroke={editing && !subediting ? '#1DFF58' : 'white'} strokeWidth={this.lineWidth} strokeDasharray={!havemark ? '10, 5' : ''}/>
                        <Circle 
                        fill={editing ? '#1DFF58' : 'white'}
                        cx={x1}
                        cy={y1}
                        r={this.lineCapRadius * scale}
                    />
                        <Circle 
                        fill={editing ? '#1DFF58' : 'white'}
                        cx={x2}
                        cy={y2}
                        r={this.lineCapRadius * scale}
                    />
                    </G> : 
                    <Line
                        strokeDasharray={!havemark ? '10, 5' : ''}
                        x1={x1}
                        y1={y1}
                        x2={x2}
                        y2={y2}
                        stroke={editing && !subediting ? '#1DFF58' : 'white'}
                        strokeWidth={this.lineWidth * scale}
                    />}
                    {havemark ? <G width={rectwidth} height={rectheight} transform={transform}>
                        <Rect
                            x={0} 
                            y={0} 
                            width={rectwidth} 
                            height={rectheight}
                            rx={corner} 
                            ry={corner}
                            strokeWidth={this.lineWidth * scale}
                            fill={editing && !subediting ? "#3FFD68" : "#E4E4E4"}>
                        </Rect>  
                        {/* <Path d={markpath} strokeWidth={this.lineWidth} stroke={editing && !subediting ? '#1DFF58' : 'white'}/> */}
                        <SVGText
                            x={marks.width / 2 + 5}
                            y={marks.height + 4}
                            fontSize="12"
                            fontWeight="bold"
                            fill='#333333'
                            textAnchor="middle"
                        >
                            {marks?.text}
                        </SVGText>
                    </G> : null}
                    {this.generateDoor(primitive)}
                    {this.generateWindow(primitive)}
                    <Circle 
                        fill={editing && !subediting ? '#1DFF58' : 'white'}
                        cx={x2}
                        cy={y2}
                        r={this.lineCapRadius * scale}
                    />
                </G>
            } else if (type == 'background') {
                return <G key={index.toString()}>
                        <SVGImage href={{uri: primitive.data}} x={primitive.x} y={primitive.y} width={primitive.width} height={primitive.height}/>
                      </G>
            } else if (type == 'angle') {
                return this.generateAngleSVG(primitive)
            } else if (type == "curve") {
                let pathData = primitive.points.map((point, index)=>{
                    return `${index === 0 ? 'M' : 'L'} ${point.x},${point.y}`;
                }).join(" ")
                return <Path key={id} d={pathData} fill="none" stroke={"#1DFF58"} strokeWidth={this.lineWidth * scale}/>
            } else if (type == "marks") {
                let width = primitive.origin.width;
                let height = primitive.origin.height
                let cornerSize = 6
                let corner = `
    M ${this.lineWidth} ${this.lineWidth + cornerSize}
    L ${this.lineWidth} ${this.lineWidth} L ${this.lineWidth + cornerSize} ${this.lineWidth}
    M ${width - this.lineWidth - cornerSize} ${this.lineWidth} L ${width - this.lineWidth} ${this.lineWidth} L ${width - this.lineWidth} ${this.lineWidth + cornerSize}
    M ${width - this.lineWidth - cornerSize} ${height - this.lineWidth} L ${width - this.lineWidth} ${height - this.lineWidth} L ${width - this.lineWidth} ${height - this.lineWidth - cornerSize}
    M ${this.lineWidth} ${height - this.lineWidth - cornerSize} L ${this.lineWidth} ${height - this.lineWidth} L ${cornerSize + this.lineWidth} ${height - this.lineWidth}
    `
                let visible = primitive.visible
                if (!visible) {
                    return null
                }
                return <G key={id} x={primitive.origin.x} y={primitive.origin.y} 
                // onMoveShouldSetResponder={(e)=>{
                //     this.currentResponder = primitive
                //     return true
                // }} 
                // onResponderGrant={(event)=>{
                //     const { locationX, locationY } = event.nativeEvent
                //     this.startPoint = {
                //         x: locationX,
                //         y: locationY
                //     }
                //     this.initialMarkLocation = {
                //         x: primitive.origin.x,
                //         y: primitive.origin.y
                //     }
                //     this.saveCanvasForRedoUndo();
                // }} onResponderMove={(event)=>{
                //     const { locationX, locationY } = event.nativeEvent
                //     let scale = this.state.canvas.viewPortWidth / this.state.canvas.width
                //     let dx = (locationX - this.startPoint.x) * scale
                //     let dy = (locationY - this.startPoint.y) * scale
                //     primitive.origin.x = this.initialMarkLocation.x + dx;
                //     primitive.origin.y = this.initialMarkLocation.y + dy;
                //     this.setState({
                //         canvas: this.state.canvas
                //     })
                // }}
                //  onResponderEnd={(event)=>{
                //     this.startPoint = null;
                //     this.initialMarkLocation = null;
                //     this.currentResponder = null;
                //     this.addARedoUndoRecord()
                // }}
                >
                    <Rect width={width} height={height} strokeWidth={this.lineWidth * scale} stroke={editing ? "#1DFF58" : "white"} fill={'none'}/>
                    <Path d={corner} strokeWidth={this.lineWidth * scale} stroke={editing ? "#1DFF58" : "white"} fill={'none'}/>
                    <SVGText onLayout={(e)=>{
                        let width = e.nativeEvent.layout.width;
                        primitive.origin.width = width + 20 > 100 ? 100 : width + 20;
                        this.setState({
                            canvas: this.state.canvas
                        })
                    }}
                            x={width / 2}
                            y={height / 2 + 4}
                            fontSize="12"
                            fontWeight="bold"
                            fill='white'
                            textAnchor='middle'
                        >
                            {primitive.marks}
                        </SVGText>
                </G>
            }
            else {
                return null
            }
        })
        return reassmbles
    }

    svgBox() {
        return "" + this.state.canvas.viewPortX + " " + this.state.canvas.viewPortY + " " + this.state.canvas.viewPortWidth + " " + this.state.canvas.viewPortHeight
    }

    changePrimitive(type) {
        if (type == "polygon") {
            this.setState({
                polyvisible: true
            })
            return
        }
        if (type == "curve") {
            //画任意曲线
            this.setState({
                drawingPrimitiveType: type,
                polyvisible: false
            })
            return
        }
        if (type == "hidemark") {
            //这里隐藏所有标注
            let allmarks = this.state.canvas.primitives.filter(p=>{
                return p.primitive == "marks"
            })
            let showedmarks = allmarks.filter(pp=>{
                return pp.visible
            })
            if (showedmarks.length != 0) {
                //隐藏所有标注
                this.saveCanvasForRedoUndo()
                allmarks.forEach(pp=>{
                    pp.visible = false
                })
                this.setState({
                    canvas: this.state.canvas
                },()=>{
                    this.addARedoUndoRecord()
                })

            } else {
                //显示所有标注
                this.saveCanvasForRedoUndo()
                allmarks.forEach(pp=>{
                    pp.visible = true
                })
                this.setState({
                    canvas: this.state.canvas
                },()=>{
                    this.addARedoUndoRecord()
                })
            }
        }
        if (type == "window") {
            let editingLines = this.state.canvas.primitives.filter(primitive=>{
                return primitive.editing && primitive.primitive == 'line'
            })
            if (editingLines.length > 0) {
                this.saveCanvasForRedoUndo()
                let line = editingLines[0]
                let x1 = line.points[0].x
                let y1 = line.points[0].y
                let x2 = line.points[1].x
                let y2 = line.points[1].y
                let centerx = (x1 + x2) / 2
                let centery = (y1 + y2) / 2
                let quadx = (x2 + centerx) / 2
                let quady = (y2 + centery) / 2
                let iconWidth = 22
                let iconHeight = 22
                let newWindow = {
                    x: quadx - iconWidth / 2,
                    y: quady - iconWidth / 2,
                    width: iconWidth,
                    height: iconHeight,
                    editing: true,
                    visible: true,
                }
                line.windows?.forEach(window=>{
                    window.editing = false
                })
                line.doors?.forEach(door=>{
                    door.editing = false
                })
                if (line.windows) {
                    line.windows = [...line.windows, newWindow]
                } else {
                    line.windows = [newWindow]
                }
                if (line.doors) {
                    line.doors.forEach(door=>{
                        door.editing = false
                    })
                }
                this.setState({
                    canvas: this.state.canvas
                },()=>{
                    this.addARedoUndoRecord()
                })
            }
            return
        }
        if (type == "door") {
            let lines = this.state.canvas.primitives.filter(d=>{
                return d.editing
            })
            if (lines.length > 0) {
                this.saveCanvasForRedoUndo()
                let line = lines[lines.length - 1]
                //需要算好门的坐标
                let door = {
                    state: 0, //0 左门朝下 1左门朝上 2右门朝上 3右门朝下
                    editing: true,
                    visible: true,
                }
                let x1 = line.points[0].x
                let y1 = line.points[0].y
                let x2 = line.points[1].x
                let y2 = line.points[1].y
                let centerx = (x1 + x2) / 2
                let centery = (y1 + y2) / 2
                let quadx = (x1 + centerx) / 2
                let quady = (y1 + centery) / 2
                door.origin = {
                    x: quadx,
                    y: quady
                }
                line.windows?.forEach(window=>{
                    window.editing = false
                })
                line.doors?.forEach(door=>{
                    door.editing = false
                })
                if (line.doors) {
                    line.doors = [...line.doors, door]
                } else {
                    line.doors = [door]
                }
                this.setState({
                    canvas: this.state.canvas
                },()=>{
                    this.addARedoUndoRecord()
                })

            }
            return
        }

        if (this.state.drawingPrimitiveType == type) {
            //已处在该状态
            console.log('已经处在' + type + '状态')
            return
        }
        if (type == "angle") {
            Toast.show({
                type: 'info',
                text1: '请选择两条相交直线'
              });
        }
        if (type == "background") {
            this.ActionSheet.show()
            return
        }
        this.setState({
            drawingPrimitiveType: type
        })
    }

    pickImageFromAubum() {
        if (Platform.OS == 'android') {
            check(PERMISSIONS.ANDROID.READ_MEDIA_IMAGES)
            .then(granted=>{
                if (granted) {
                    ImagePicker.openPicker({
                        cropping: false,
                        includeExif: false,
                        includeBase64: true,
                        multiple: false,
                        mediaType: "photo",
                        maxFiles: 1
                    })
                    .then(image=>{
                        this.saveCanvasForRedoUndo()
                        let base64 = "data:image/png;base64," + image.data
                        let background = {
                            id: this.guid(),
                            primitive: "background",
                            data: base64,
                            x: 0,
                            y: 0,
                            width: this.state.canvas.width,
                            height: this.state.canvas.height
                        }
                        let bg = this.state.canvas.primitives.find(pp=>{
                            return pp.primitive == "background"
                        })
                        if (bg) {
                            bg.data = base64
                            primitives.forEach((d)=>{
                                d.draft = false
                                d.editing = false
                            })
                            this.state.canvas.primitives = primitives
                            this.setState({
                                canvas: this.state.canvas,
                            },()=>{
                                this.addARedoUndoRecord()
                            })
                        } else {
                            let primitives = [background,...this.state.canvas.primitives]
                        primitives.forEach((d)=>{
                            d.draft = false
                            d.editing = false
                        })
                        this.state.canvas.primitives = primitives
                        this.setState({
                            canvas: this.state.canvas,
                        },()=>{
                            this.addARedoUndoRecord()
                        })
                        }
        
                    })
                    .catch(e=>{})
                }
            })
            .catch(error=>{

            })
        } else {
            ImagePicker.openPicker({
                cropping: false,
                includeExif: false,
                includeBase64: true,
                multiple: false,
                mediaType: "photo",
                maxFiles: 1
            })
            .then(image=>{
                this.saveCanvasForRedoUndo()
                let base64 = "data:image/png;base64," + image.data
                let background = {
                    id: this.guid(),
                    primitive: "background",
                    data: base64,
                    x: 0,
                    y: 0,
                    width: this.state.canvas.width,
                    height: this.state.canvas.height
                }
                let bg = this.state.canvas.primitives.find(pp=>{
                    return pp.primitive == "background"
                })
                if (bg) {
                    bg.data = base64
                    let primitives = this.state.canvas.primitives.filter(dd=>{
                        return dd.id != bg.id
                    })
                    primitives = [bg, ...primitives]
                    primitives.forEach((d)=>{
                        d.draft = false
                        d.editing = false
                    })
                    this.state.canvas.primitives = primitives
                    this.setState({
                        canvas: this.state.canvas,
                    },()=>{
                        this.addARedoUndoRecord()
                    })
                } else {
                    let primitives = [background,...this.state.canvas.primitives]
                primitives.forEach((d)=>{
                    d.draft = false
                    d.editing = false
                })
                this.state.canvas.primitives = primitives
                this.setState({
                    canvas: this.state.canvas,
                },()=>{
                    this.addARedoUndoRecord()
                })
                }

            })
            .catch(e=>{})
        }
    }
    pickImageFromCamera() {
        if (Platform.OS == 'android') {
            check(PERMISSIONS.ANDROID.CAMERA)
            .then(granted=>{
                if (granted) {
                    ImagePicker.openCamera({
                        cropping: false,
                        includeExif: false,
                        includeBase64: true,
                        multiple: false,
                        mediaType: "photo",
                        maxFiles: 1
                    })
                    .then(image=>{
                        this.saveCanvasForRedoUndo()
                        let base64 = "data:image/png;base64," + image.data
                        let background = {
                            id: this.guid(),
                            primitive: "background",
                            data: base64,
                            x: 0,
                            y: 0,
                            width: this.state.canvas.width,
                            height: this.state.canvas.height
                        }
                        let bg = this.state.canvas.primitives.find(pp=>{
                            return pp.primitive == "background"
                        })
                        if (bg) {
                            bg.data = base64
                            primitives.forEach((d)=>{
                                d.draft = false
                                d.editing = false
                            })
                            this.state.canvas.primitives = primitives
                            this.setState({
                                canvas: this.state.canvas,
                            },()=>{
                                this.addARedoUndoRecord()
                            })
                        } else {
                            let primitives = [background,...this.state.canvas.primitives]
                        primitives.forEach((d)=>{
                            d.draft = false
                            d.editing = false
                        })
                        this.state.canvas.primitives = primitives
                        this.setState({
                            canvas: this.state.canvas,
                        },()=>{
                            this.addARedoUndoRecord()
                        })
                        }
        
                    })
                    .catch(e=>{})
                }
            })
            .catch(error=>{

            })
        } else {
            ImagePicker.openCamera({
                cropping: false,
                includeExif: false,
                includeBase64: true,
                multiple: false,
                mediaType: "photo",
                maxFiles: 1
            })
            .then(image=>{
                this.saveCanvasForRedoUndo()
                let base64 = "data:image/png;base64," + image.data
                let background = {
                    id: this.guid(),
                    primitive: "background",
                    data: base64,
                    x: 0,
                    y: 0,
                    width: this.state.canvas.width,
                    height: this.state.canvas.height
                }
                let bg = this.state.canvas.primitives.find(pp=>{
                    return pp.primitive == "background"
                })
                if (bg) {
                    bg.data = base64
                    let primitives = this.state.canvas.primitives.filter(dd=>{
                        return dd.id != bg.id
                    })
                    primitives = [bg, ...primitives]
                    primitives.forEach((d)=>{
                        d.draft = false
                        d.editing = false
                    })
                    this.state.canvas.primitives = primitives
                    this.setState({
                        canvas: this.state.canvas,
                    },()=>{
                        this.addARedoUndoRecord()
                    })
                } else {
                    let primitives = [background,...this.state.canvas.primitives]
                primitives.forEach((d)=>{
                    d.draft = false
                    d.editing = false
                })
                this.state.canvas.primitives = primitives
                this.setState({
                    canvas: this.state.canvas,
                },()=>{
                    this.addARedoUndoRecord()
                })
                }

            })
            .catch(e=>{})
        }
    }
    //根视图布局就绪后调整SVG的大小
    layoutCanvas(e){
        let width = e.nativeEvent.layout.width;
        let height = e.nativeEvent.layout.height;
        let canvas = this.state.canvas;
        //初始状态下的viewport是svg中心位置，并且面积是svg的一半
        let vpWidth = width * this.scale
        let vpHeight = height * this.scale
        // this.notNeedLayout = true
        if (this.notNeedLayout) {
            return
        } else {
            canvas.viewPortX = (1 - this.scale) / 2 * width;
        canvas.viewPortY = (1 - this.scale) / 2 * height;
        canvas.viewPortWidth = vpWidth;
        canvas.viewPortHeight = vpHeight;
        canvas.width = width;
        canvas.height = height;
        this.setState({
            canvas: canvas,
            svgWidth: width,
            svgHeight: height
        })
        }
    }

    editingItems(){
        let editingPrimitives = this.state.canvas.primitives.filter(d=>{
            return d.editing
        })
        if (editingPrimitives.length == 1) {
            let editingPrimitive = editingPrimitives[0]
            if (editingPrimitive == undefined) {
                return []
            }
            if (editingPrimitive.primitive == 'marks') {
                return ["删除","自定义"]
            } else if (editingPrimitive.primitive == 'line') {
                let editingWindow = editingPrimitive.windows?.find(window=>{
                    return window.editing
                })
                if (editingWindow) {
                    return ["删除","自定义"]
                }
    
                let editingDoor = editingPrimitive.doors?.find(door=>{
                    return door.editing
                })
                if (editingDoor) {
                    return ["删除","自定义"]
                }
                return ["删除","自定义",...this.state.linemarks]
            } else if (editingPrimitive.primitive == 'angle') {
                return ["删除","自定义"]
            }
        } else {
            return []
        }
        return []
    }

    saveSVGToPDF() {
        if (this.state.canvas.primitives.length == 0) {
            Toast.show({
                type: "error",
                text1: "空画布！"
            })
            return
        }
        this.saveCanvasForRedoUndo()
        // this.state.canvas.primitives.forEach(d=>{})
        this.cancelEditing();
        let left = this.state.canvas.viewPortX
        let top = this.state.canvas.viewPortY
        let right = left + this.state.canvas.viewPortWidth
        let bottom = top + this.state.canvas.viewPortHeight
        for (let index = 0; index < this.state.canvas.primitives.length; index++) {
            const element = this.state.canvas.primitives[index];
            if (element.primitive == "line") {
                let point1 = element.points[0]
                let point2 = element.points[1]
                let lft = point1.x < point2.x ? point1.x : point2.x 
                let tp = point1.y < point2.y ? point1.y : point2.y
                let rig = point1.x > point2.x ? point1.x : point2.x
                let bt = point1.y > point2.y ? point1.y : point2.y
                if (!left || lft < left) {
                    left = lft
                }
                if (!top || tp < top) {
                    top = tp
                }
                if (!right || rig > right) {
                    right = rig
                }
                if (!bottom || bt > bottom) {
                    bottom = bt
                }
            } else if (element.primitive == "marks") {
                let lft = element.origin.x
                let tp = element.origin.y
                let rig = element.origin.x + element.origin.width
                let bt = element.origin.y + element.origin.height
                if (!left || lft < left) {
                    left = lft
                }
                if (!top || tp < top) {
                    top = tp
                }
                if (!right || rig > right) {
                    right = rig
                }
                if (!bottom || bt > bottom) {
                    bottom = bt
                }
            }
        }
        this.state.canvas.viewPortX = left - 50
        this.state.canvas.viewPortY = top - 50 
        this.state.canvas.viewPortWidth = (right - left) + 100
        this.state.canvas.viewPortHeight = (bottom - top) + 100
        this.setState({
            canvas: this.state.canvas
        },()=>{
            this.addARedoUndoRecord()
            //add todo
            this.shot
            .capture()
            .then(async res=>{
                const images = [res]
                const options = {
                    imagePaths: images,
                    name: this.state.title,
                    maxSize: { width: this.state.canvas.viewPortWidth, height: this.state.canvas.viewPortHeight},
                    quality: 0.8
                }
                try {
                    const filePath = await RNImageToPDF.createPDFbyImages(options);
                    let path = filePath.filePath
                    Toast.show({
                        type: 'success',
                        text1: "PDF保存成功，保存位置为:" + path
                    })
                    this.undo()
                } catch (error) {
                    console.log(error)
                    this.undo()
                }
            })
            .catch((error)=>{
                this.undo()
            })
        })
    }

    emailPNG(){
        if (this.state.canvas.primitives.length == 0) {
            Toast.show({
                type: "error",
                text1: "空画布！"
            })
            return
        }
        this.saveCanvasForRedoUndo()
        // this.state.canvas.primitives.forEach(d=>{})
        this.cancelEditing();
        let left = this.state.canvas.viewPortX
        let top = this.state.canvas.viewPortY
        let right = left + this.state.canvas.viewPortWidth
        let bottom = top + this.state.canvas.viewPortHeight
        for (let index = 0; index < this.state.canvas.primitives.length; index++) {
            const element = this.state.canvas.primitives[index];
            if (element.primitive == "line") {
                let point1 = element.points[0]
                let point2 = element.points[1]
                let lft = point1.x < point2.x ? point1.x : point2.x 
                let tp = point1.y < point2.y ? point1.y : point2.y
                let rig = point1.x > point2.x ? point1.x : point2.x
                let bt = point1.y > point2.y ? point1.y : point2.y
                if (!left || lft < left) {
                    left = lft
                }
                if (!top || tp < top) {
                    top = tp
                }
                if (!right || rig > right) {
                    right = rig
                }
                if (!bottom || bt > bottom) {
                    bottom = bt
                }
            } else if (element.primitive == "marks") {
                let lft = element.origin.x
                let tp = element.origin.y
                let rig = element.origin.x + element.origin.width
                let bt = element.origin.y + element.origin.height
                if (!left || lft < left) {
                    left = lft
                }
                if (!top || tp < top) {
                    top = tp
                }
                if (!right || rig > right) {
                    right = rig
                }
                if (!bottom || bt > bottom) {
                    bottom = bt
                }
            }
        }
        this.state.canvas.viewPortX = left - 50
        this.state.canvas.viewPortY = top - 50 
        this.state.canvas.viewPortWidth = (right - left) + 100
        this.state.canvas.viewPortHeight = (bottom - top) + 100
        this.setState({
            canvas: this.state.canvas
        },()=>{
            this.addARedoUndoRecord()
            this.shot
            .capture()
            .then(res=>{
                this.undo()
                try {
                    this.setState({
                        sharevisible: false
                    }, async ()=>{
                        let rs = await TurboMailer.sendMail({
                            subject: this.state.title,
                            recipients: [],
                            body: this.state.title,
                            attachments: [{
                                path: res,
                                mimeType: 'png'
                            }],
                        });
                        console.log(rs)
                    })
                } catch (e) {
                    Toast.show({
                        type: 'error',
                        text1: e.message
                    })
                }
            })
        })
    }

    emailPDF(){
        console.log(this.state.canvas.primitives)
        if (this.state.canvas.primitives.length == 0) {
            Toast.show({
                type: "error",
                text1: "空画布！"
            })
            return
        }
        this.saveCanvasForRedoUndo()
        // this.state.canvas.primitives.forEach(d=>{})
        this.cancelEditing();
        let left = this.state.canvas.viewPortX
        let top = this.state.canvas.viewPortY
        let right = left + this.state.canvas.viewPortWidth
        let bottom = top + this.state.canvas.viewPortHeight
        for (let index = 0; index < this.state.canvas.primitives.length; index++) {
            const element = this.state.canvas.primitives[index];
            if (element.primitive == "line") {
                let point1 = element.points[0]
                let point2 = element.points[1]
                let lft = point1.x < point2.x ? point1.x : point2.x 
                let tp = point1.y < point2.y ? point1.y : point2.y
                let rig = point1.x > point2.x ? point1.x : point2.x
                let bt = point1.y > point2.y ? point1.y : point2.y
                if (!left || lft < left) {
                    left = lft
                }
                if (!top || tp < top) {
                    top = tp
                }
                if (!right || rig > right) {
                    right = rig
                }
                if (!bottom || bt > bottom) {
                    bottom = bt
                }
            } else if (element.primitive == "marks") {
                let lft = element.origin.x
                let tp = element.origin.y
                let rig = element.origin.x + element.origin.width
                let bt = element.origin.y + element.origin.height
                if (!left || lft < left) {
                    left = lft
                }
                if (!top || tp < top) {
                    top = tp
                }
                if (!right || rig > right) {
                    right = rig
                }
                if (!bottom || bt > bottom) {
                    bottom = bt
                }
            }
        }
        this.state.canvas.viewPortX = left - 50
        this.state.canvas.viewPortY = top - 50 
        this.state.canvas.viewPortWidth = (right - left) + 100
        this.state.canvas.viewPortHeight = (bottom - top) + 100
        this.setState({
            canvas: this.state.canvas
        },()=>{
            this.addARedoUndoRecord()
            //add todo
            this.shot
            .capture()
            .then(async res=>{
                this.undo()
                const images = [res]
                const options = {
                    imagePaths: images,
                    name: this.state.title,
                    maxSize: { width: this.state.canvas.viewPortWidth, height: this.state.canvas.viewPortHeight},
                    quality: 0.8
                }
                try {
                    const filePath = await RNImageToPDF.createPDFbyImages(options);
                    let path = filePath.filePath
                    this.setState({
                        sharevisible: false
                    }, async ()=>{
                        await TurboMailer.sendMail({
                            subject: this.state.title,
                            recipients: [],
                            body: this.state.title,
                            attachments: [{
                                path: path,
                                mimeType: 'png'
                            }],
                        });
                    })
                } catch (error) {
                    console.log(error)
                }
            })
            .catch((error)=>{
                this.undo()
            })
        })
    }

    saveSVGToPNG(){
        if (this.state.canvas.primitives.length == 0) {
            Toast.show({
                type: "error",
                text1: "空画布！"
            })
            return
        }
        this.saveCanvasForRedoUndo()
        // this.state.canvas.primitives.forEach(d=>{})
        this.cancelEditing();
        let left = this.state.canvas.viewPortX
        let top = this.state.canvas.viewPortY
        let right = left + this.state.canvas.viewPortWidth
        let bottom = top + this.state.canvas.viewPortHeight
        for (let index = 0; index < this.state.canvas.primitives.length; index++) {
            const element = this.state.canvas.primitives[index];
            if (element.primitive == "line") {
                let point1 = element.points[0]
                let point2 = element.points[1]
                let lft = point1.x < point2.x ? point1.x : point2.x 
                let tp = point1.y < point2.y ? point1.y : point2.y
                let rig = point1.x > point2.x ? point1.x : point2.x
                let bt = point1.y > point2.y ? point1.y : point2.y
                if (!left || lft < left) {
                    left = lft
                }
                if (!top || tp < top) {
                    top = tp
                }
                if (!right || rig > right) {
                    right = rig
                }
                if (!bottom || bt > bottom) {
                    bottom = bt
                }
            } else if (element.primitive == "marks") {
                let lft = element.origin.x
                let tp = element.origin.y
                let rig = element.origin.x + element.origin.width
                let bt = element.origin.y + element.origin.height
                if (!left || lft < left) {
                    left = lft
                }
                if (!top || tp < top) {
                    top = tp
                }
                if (!right || rig > right) {
                    right = rig
                }
                if (!bottom || bt > bottom) {
                    bottom = bt
                }
            }
        }
        this.state.canvas.viewPortX = left - 50
        this.state.canvas.viewPortY = top - 50 
        this.state.canvas.viewPortWidth = (right - left) + 100
        this.state.canvas.viewPortHeight = (bottom - top) + 100
        this.setState({
            canvas: this.state.canvas
        },()=>{
            this.addARedoUndoRecord()
            this.shot
            .capture()
            .then(async res=>{
                if (Platform.OS == 'ios') {
                    CameraRoll.saveAsset(res)
                            .then(res=>{
                                Toast.show({
                                    type: 'success',
                                    text1: '图片保存成功'
                                })
                                this.undo()
                            })
                            .catch(e=>{
                                Toast.show({
                                    type: 'error',
                                    text1: '图片保存失败'
                                })
                                this.undo()
                            })
                } else {
                    check(PERMISSIONS.ANDROID.WRITE_EXTERNAL_STORAGE)
                    .then(grant=>{
                        if (grant) {
                            CameraRoll.saveAsset(res)
                            .then(res=>{
                                Toast.show({
                                    type: 'success',
                                    text1: '图片保存成功'
                                })
                                this.undo()
                            })
                            .catch(e=>{
                                Toast.show({
                                    type: 'error',
                                    text1: '图片保存失败'
                                })
                                this.undo()
                            })
                        } else {
                            Toast.show({
                                type: 'error',
                                text1: '图片保存失败'
                            })
                            this.undo()
                        }
                    })
                    .catch(e=>{
                        Toast.show({
                            type: 'error',
                            text1: '图片保存失败'
                        })
                        this.undo()
                    })
                }
                })
        })
    }

    cancelEditing(){
        this.state.canvas.primitives.forEach(pp=>{
            pp.editing = false
            if (pp.windows) {
                pp.windows.forEach(window=>{
                    window.editing = false
                })
            }
            if (pp.doors) {
                pp.doors.forEach(door=>{
                    door.editing = false
                })
            }
        })
    }


    changePolygonType(type) {
        this.saveCanvasForRedoUndo()
        this.cancelEditing();
        this.setState({
            drawingPrimitiveType: 'polygon ' + type,
            polyvisible: false,
            canvas: this.state.canvas
        },()=>{
            this.addARedoUndoRecord();
        })
    }

    //判定底部多边形应该显示哪一种多边形图标
    currentPolygonImage(type) {
        if (type == undefined || type == '') {
            return <Image tintColor={this.state.drawingPrimitiveType?.indexOf("polygon") >= 0 ? "#3FFD68" : null} source={require('../../assets/Canvas/polyshape/poly0.png')} style={{
                width: 24, height: 24
            }}/>
        } else if (type == "polygon 3") {
            return <Image tintColor={"#3FFD68"} source={require('../../assets/Canvas/polyshape/poly3.png')} style={{
                width: 21, height: 19
            }}/>
        } else if (type == "polygon 4") {
            return <Image tintColor={"#3FFD68"} source={require('../../assets/Canvas/polyshape/poly4.png')} style={{
                width: 20, height: 20
            }}/>
        } else if (type == "polygon 41") {
            return <Image tintColor={"#3FFD68"} source={require('../../assets/Canvas/polyshape/poly41.png')} style={{
                width: 27, height: 22
            }}/>
        } else if (type == "polygon 42") {
            return <Image tintColor={"#3FFD68"} source={require('../../assets/Canvas/polyshape/poly42.png')} style={{
                width: 26, height: 18
            }}/>
        } else if (type == "polygon 43") {
            return <Image tintColor={"#3FFD68"} source={require('../../assets/Canvas/polyshape/poly43.png')} style={{
                width: 27, height: 27
            }}/>
        } else if (type == "polygon 5") {
            return <Image tintColor={"#3FFD68"} source={require('../../assets/Canvas/polyshape/poly5.png')} style={{
                width: 24, height: 23
            }}/>
        } else if (type == "polygon 6") {
            return <Image tintColor={"#3FFD68"} source={require('../../assets/Canvas/polyshape/poly6.png')} style={{
                width: 26, height: 23
            }}/>
        } else if (type == "polygon 8") {
            return <Image tintColor={"#3FFD68"} source={require('../../assets/Canvas/polyshape/poly8.png')} style={{
                width: 26, height: 26
            }}/>
        } else if (type == "polygon 10") {
            return <Image tintColor={"#3FFD68"} source={require('../../assets/Canvas/polyshape/poly10.png')} style={{
                width: 27, height: 26
            }}/>
        } else if (type == "polygon 12") {
            return <Image tintColor={"#3FFD68"} source={require('../../assets/Canvas/polyshape/poly12.png')} style={{
                width: 27, height: 26
            }}/>
        }
        else if (type=="curve") {
            return <Image tintColor={"#3FFD68"} source={require('../../assets/Canvas/polyshape/polyrandom.png')} style={{
                width: 17.3, height: 21
            }}/>
        } else {
            console.log(type + "haha")
            return <Image tintColor={this.state.drawingPrimitiveType?.indexOf("polygon") >= 0 ? "#3FFD68" : null} source={require('../../assets/Canvas/polyshape/poly0.png')} style={{
                width: 24, height: 24
            }}/>
        }
        return;
    }

    render(){
        return <SafeAreaView style={{flex: 1, backgroundColor: 'rgba(37, 37, 37, 255)'}} edges={['top']}>
            <NavigationBar title={this.state.title} leftViews={
                <TouchableOpacity style={{
                    width: 77,
                    height: 28,
                    borderRadius: 14,
                    borderColor: '#999999',
                    borderWidth: 0.5,
                    alignItems: 'center',
                    justifyContent: 'center',
                }} onPress={async ()=>{
                    if (this.state.canvas.primitives.length == 0) {
                        this.props.navigation.goBack()
                        return
                    }
                    this.cancelEditing()
                    StorageUtil.save(this.id, this.state.canvas)
                    let filelist = await StorageUtil.get("docs")
                    this.canvas.toDataURL((res)=>{
                        let data = {
                            id: this.id,
                            name: this.name,
                            preview: res
                        }
            if (!filelist || filelist.length == 0) {
                filelist = [data]
            } else {
                let oldData = filelist.find(d=>{
                    return d.id == this.id
                })
                if (oldData) {
                    let idx = filelist.indexOf(oldData)
                    filelist[idx] = data
                } else {
                    filelist.push(data)
                }
            }
            StorageUtil.save("docs", filelist)
            this.props.navigation.goBack()
        })
                }}>
                    <Text style={{
                        fontSize: 12,
                        color: 'white'
                    }}>complete</Text>
                </TouchableOpacity>
            } rightViews={
                <TouchableOpacity style={{
                    width: 20, alignItems: 'center', justifyContent: 'center', flex: 1
                }} onPress={async ()=>{
                    this.setState({
                        menuvisible: !this.state.menuvisible
                    })
                }}>
                    <Image source={require("../../assets/Canvas/more.png")} style={{
                        width: 4, height: 18
                    }}/>
                    
                </TouchableOpacity>
            }/>
            
            <View style={{flex: 1}}>
            <ViewShot style={{flex: 1}} ref={(o)=>{
                this.shot = o;
            }}>
            <GestureHandlerRootView style={{
                flex: 1
            }}>
                <PinchGestureHandler 
                    onHandlerStateChange={this.onPinchStateChange.bind(this)} 
                    onGestureEvent={this.onPinchEvent.bind(this)}
                >
                <TapGestureHandler onHandlerStateChange={(event)=>{
                    if (event.nativeEvent.state == State.END) {
                        let primitive = this.getPrimitiveAt(event.nativeEvent.x, event.nativeEvent.y)
                        if (primitive) {
                            this.onClickPrimitive(primitive)
                            return
                        } else {
                            //取消编辑状态
                            let editingPrimitive = this.state.canvas.primitives.find(p=>{
                                return p.editing
                            })
                            if (editingPrimitive) {
                                this.saveCanvasForRedoUndo()
                                this.cancelEditing()
                                this.setState({
                                    canvas: this.state.canvas
                                },()=>{
                                    this.addARedoUndoRecord()
                                })
                            }
                        }
                    }
                }}>
                <View style={{flex: 1, backgroundColor: 'black'}} onLayout={this.layoutCanvas.bind(this)}
                onMoveShouldSetResponder={(e)=>{
                    if (this.currentResponder) {
                        return false
                    }
                    return true
                }} 
                onResponderGrant={this.onPanBegin.bind(this)} 
                onResponderMove={this.onPanEvent.bind(this)} 
                onResponderEnd={this.onPanEnd.bind(this)}
                >
                    <Svg ref={(o)=>{this.canvas = o;}} height={this.state.canvas.height} width={this.state.canvas.width} viewBox={this.svgBox()}>
                        {this.renderPrimitives(this.state.canvas.primitives)}
                        {this.renderPrimitives(this.state.auxiliary)}
                    </Svg>
                </View>
                </TapGestureHandler>
                </PinchGestureHandler>
            </GestureHandlerRootView>
            </ViewShot>
                    <View style={{flexDirection: 'row', position: 'absolute', left: 14, top: 18, right: 14}}>
                    <TouchableOpacity onPress={this.changePrimitive.bind(this, 'polygon')}>
                        <Image source={this.state.drawingPrimitiveType.indexOf("polygon") >= 0 ? require('../../assets/Canvas/polygon_sel.png') : require('../../assets/Canvas/polygon.png')} style={{
                            width: 32, height: 32
                        }}/>
                    </TouchableOpacity>
                    <View style={{flex: 1}}/>
                    <TouchableOpacity onPress={this.undo.bind(this)}>
                        <Image source={require('../../assets/Canvas/undo.png')} style={{
                            width: 32, height: 32
                        }}/>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={this.redo.bind(this)} style={{
                        width: 32, height: 32,
                        alignItems: 'center', justifyContent: 'center',
                        backgroundColor: '#3D3D3D',
                        borderRadius: 8,
                        marginLeft: 14
                    }}>
                        <Image source={require('../../assets/Canvas/redo.png')} style={{
                            width: 16, height: 16
                        }}/>
                    </TouchableOpacity>
                    </View>
                    <View style={{marginTop: 78, position: 'absolute', left: 14}}>
                    <View style={[{
                        marginTop:12
                    }]}
                    onMoveShouldSetResponder={(e)=>{
                        this.addMarkOrigin = {
                            x: 14,
                            y: 78,
                            width: 28,
                            height: 28
                        }
                        this.changePrimitive('marks')
                        this.beginDrawMarks(e)
                        return true
                    }}
                    onResponderMove={(event)=>{
                        this.drawingMarks(event)
                    }}
                    onResponderEnd={(event)=>{
                        this.endDrawMarks(event)
                    }}
                    >
                        <Image source={require('../../assets/Canvas/text.png')} style={{
                            width: 32, height: 32
                        }}/>
                    </View>
                    <TouchableOpacity onPress={this.changePrimitive.bind(this, 'hidemark')} style={[{
                        marginTop:12
                    },styles.operateButton]}>
                        <Image source={require('../../assets/Canvas/hidetext.png')} style={{
                            width: 32, height: 32
                        }}/>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={this.changePrimitive.bind(this, 'window')} style={[{
                        marginTop:12
                    }]}>
                        <Image source={require('../../assets/Canvas/window.png')} style={{
                            width: 32, height: 32
                        }}/>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={this.changePrimitive.bind(this, 'door')} style={[{
                        marginTop:12
                    }]}>
                        <Image source={require('../../assets/Canvas/door.png')} style={{
                            width: 32, height: 32
                        }}/>
                    </TouchableOpacity>
                    </View>
            {this.editingItems().length > 0  ? <View style={{
                    position: 'absolute',
                    left: 0,
                    right: 0,
                    height: 36,
                    bottom: 8,
                }}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                        {this.editingItems().map((data, index)=>{
                            return <TouchableOpacity key={index.toString()} style={{
                                backgroundColor: '#3D3D3D',
                                height: 36,
                                alignItems: 'center',
                                justifyContent: 'center',
                                paddingLeft: 16,
                                paddingRight: 16,
                                marginLeft: 8,
                                borderRadius: 8
                            }} onPress={()=>{
                                //应该找到当前正在编辑的标注或者直线，修改标注或者直线的标注
                                let editingPrimitive = this.state.canvas.primitives.find(d=>{
                                    return d.editing
                                })
                                if (data == "自定义") {
                                    //这个需要弹框
                                    if (editingPrimitive.primitive == 'marks') {
                                        this.setState({
                                            markvisible: true,
                                        })
                                    } else if (editingPrimitive.primitive == 'line') {
                                        let window = editingPrimitive.windows?.find(window=>{
                                            return window.editing
                                        })
                                        if (window) {
                                            let width = window?.l?.replace("L:","")?.replace("m","")
                                            let height = window?.h?.replace("H:","")?.replace("m","")
                                            this.setState({
                                                windowvisible: true,
                                                windowwidth: width,
                                                windowheight: height
                                            })
                                            return
                                        }
                                        let door = editingPrimitive.doors?.find(door=>{
                                            return door.editing
                                        })
                                        if (door) {
                                            let width = door?.l?.replace("L:","")?.replace("m","")
                                            let height = door?.h?.replace("H:","")?.replace("m","")
                                            let state = door.state
                                            this.setState({
                                                doorvisible: true,
                                                doorwidth: width,
                                                doorheight: height,
                                                doorstate: state
                                            })
                                            return
                                        }
                                        let mark = editingPrimitive.marks?.text?.replace("m","")
                                        let height = editingPrimitive.thirdPoint?.h
                                        let ogheight = height
                                        if (height) {
                                            height = Math.abs(height)
                                        }
                                        this.setState({
                                            linemarkvisible: true,
                                            linemark: mark,
                                            lineheight: height ? Math.abs(height) + "" : "",
                                            usecurve: editingPrimitive.thirdPoint != undefined,
                                            heightoutter: (ogheight && ogheight > 0)
                                        })
                                    } else if (editingPrimitive.primitive == 'angle') {
                                        this.setState({
                                            anglevisible: true,
                                            angle: editingPrimitive.angle
                                        })
                                    }
                                    return
                                } else if (data == "删除") {
                                    this.saveCanvasForRedoUndo()
                                    let editingPrimitive = this.state.canvas.primitives.find(dd=>{
                                        return dd.editing
                                    })
                                    let deleteSubPrimitive = false
                                    if (editingPrimitive.primitive == 'line') {
                                        let editingWindow = editingPrimitive.windows?.find(window=>{
                                            return window.editing
                                        })
                                        if (editingWindow) {
                                            //删除这个window
                                            deleteSubPrimitive = true
                                            editingPrimitive.windows = editingPrimitive.windows?.filter(window=>{
                                                return !window.editing
                                            })
                                        }
                                        let editingDoor = editingPrimitive.doors?.find(door=>{
                                            return door.editing
                                        })
                                        if (editingDoor) {
                                            deleteSubPrimitive = true
                                            editingPrimitive.doors = editingPrimitive.doors.filter(door=>{
                                                return !door.editing
                                            })
                                        }
                                    }
                                    if (deleteSubPrimitive) {
                                        this.setState({
                                            canvas: this.state.canvas
                                        },()=>{
                                            this.addARedoUndoRecord()
                                        })
                                    } else {
                                        this.state.canvas.primitives = this.state.canvas.primitives.filter(dd=>{
                                            return dd.id != editingPrimitive.id
                                        })
                                        this.setState({
                                            canvas: this.state.canvas
                                        },()=>{
                                            this.addARedoUndoRecord()
                                        })
                                    }
                                    return
                                }
                                if (editingPrimitive.primitive == 'marks') {
                                    this.saveCanvasForRedoUndo()
                                    editingPrimitive.marks = data
                                    editingPrimitive.visible = true
                                    this.setState({
                                        canvas: this.state.canvas,
                                        mark: data
                                    },()=>{
                                        this.addARedoUndoRecord()
                                    })
                                } else if (editingPrimitive.primitive == 'line') {
                                    this.saveCanvasForRedoUndo()
                                    let numbers = this.extractNumbers(data)
                                    let number = numbers[0]
                                    if (editingPrimitive.marks) {
                                        editingPrimitive.marks.text = data
                                        editingPrimitive.marks.visible = true
                                    } else {
                                        let width = 10 + data.length * 6
                                        let marks = {
                                            text: data,
                                            visible: true,
                                            width: width,
                                            height: 10
                                        }
                                        editingPrimitive.marks = marks
                                    }
                                    this.setState({
                                        canvas: this.state.canvas,
                                        linemark: number + ""
                                    },()=>{
                                        this.addARedoUndoRecord()
                                    })
                                }
                            }}>
                                <Text style={{
                                    color: '#BFBFBF',
                                    fontSize: 14,
                                    fontWeight: '600'
                                }}>{data}</Text>
                            </TouchableOpacity>
                        })}
                    </ScrollView>
                </View> : null}
                {
            this.state.menuvisible ? <TouchableOpacity onPress={()=>{
                this.setState({
                    menuvisible: false
                })
            }} activeOpacity={1} style={{backgroundColor: "rgba(0,0,0,0.3)", position: 'absolute', right: 0, top: 0, bottom: 0, left: 0}}>
                <View style={{
                    backgroundColor: '#252525',
                    width: 120,
                    borderRadius: 8,
                    paddingLeft: 11,
                    paddingRight: 11,
                    position: 'absolute',
                    right: 14,
                    top: 4
                }}>
                    <TouchableOpacity onPress={()=>{
                        this.setState({
                            renameShow: true,
                            editedTitle: this.state.title,
                            menuvisible: false
                        })
                    }} style={{ height: 45, alignItems: 'center', flexDirection: 'row'}}>
                        <Image source={require('../../assets/Canvas/rename.png')} style={{
                            width: 10, height: 10
                        }}/>
                        <Text style={{marginLeft: 10, color: 'white', fontSize: 14}}>rename</Text>
                    </TouchableOpacity>
                    <View style={{
                        width: 98, height: 0.2, backgroundColor: "#D8D8D8"
                    }}/>
                    <TouchableOpacity onPress={()=>{
                        this.setState({
                            menuvisible: false,
                            sharevisible: true
                        })
                    }} style={{ height: 45, alignItems: 'center', flexDirection: 'row'}}>
                        <Image source={require('../../assets/Canvas/export.png')} style={{
                            width: 10, height: 10
                        }}/>
                        <Text style={{marginLeft: 10, color: 'white', fontSize: 14}}>export</Text>
                    </TouchableOpacity>
                    <View style={{
                        width: 98, height: 0.3, backgroundColor: "#D8D8D8"
                    }}/>
                    <TouchableOpacity onPress={()=>{
                        this.setState({
                            menuvisible: false
                        })
                        Alert.alert('提示','是否确定删除',[{
                            text: '取消',
                            onPress: ()=>{

                            },
                            style: 'cancel'
                        },{
                            text: '确定',
                            onPress: async ()=>{
                                let list = await StorageUtil.get("docs")
                                list = list?.filter(f=>{
                                    return f.id != this.id
                                })
                                StorageUtil.save('docs', list)
                                // let canvas = await StorageUtil.get(id)
                                StorageUtil.deleteItem(this.id)
                                this.props.navigation.goBack()
                            }
                        }]);
                    }} style={{ height: 45, alignItems: 'center', flexDirection: 'row'}}>
                        <Image source={require('../../assets/Canvas/delete.png')} style={{
                            width: 10, height: 10
                        }}/>
                        <Text style={{marginLeft: 10, color: 'red', fontSize: 14}}>delete</Text>
                    </TouchableOpacity>
                </View>
            </TouchableOpacity> : null
        }
            </View>
            <View style={{
                height: 50,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center'
            }}>
                <TouchableOpacity onPress={this.changePrimitive.bind(this, 'background')}>
                    <Image source={require('../../assets/Canvas/addbg.png')} style={{
                        width: 18, height: 15
                    }}/>
                </TouchableOpacity>
                <TouchableOpacity style={{marginLeft: 50}} onPress={this.changePrimitive.bind(this, 'line')}>
                    <Image tintColor={this.state.drawingPrimitiveType == 'line' ? "#3FFD68" : null} source={require('../../assets/Canvas/line.png')} style={{
                        width: 19, height: 19
                    }}/>
                </TouchableOpacity>
                <TouchableOpacity style={{marginLeft: 50}} onPress={this.changePrimitive.bind(this, 'polygon')}>
                    {this.currentPolygonImage(this.state.drawingPrimitiveType)}
                </TouchableOpacity>
                <TouchableOpacity style={{marginLeft: 50}} onPress={this.changePrimitive.bind(this, 'angle')}>
                    <Image tintColor={this.state.drawingPrimitiveType == "angle" ? "#3FFD68" : null} source={require('../../assets/Canvas/angle.png')} style={{
                        width: 24, height: 24
                    }}/>
                </TouchableOpacity>
            </View>
                {/* <View pointerEvents='box-none'>
                    <View style={{
                        flexDirection: 'row',
                        flexWrap: 'wrap'
                    }}>
                    <TouchableOpacity style={styles.button} onPress={this.changePrimitive.bind(this, 'polygon')}>
                        <Text style={{color: 'white'}}>画多边形</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.button} onPress={this.changePrimitive.bind(this, 'curve')}>
                        <Text style={{color: this.state.drawingPrimitiveType == 'curve' ? '#1DFF58' : 'white'}}>画任意曲线</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.button} onPress={this.undo.bind(this)}>
                        <Text style={{color: 'white'}}>撤销</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.button} onPress={this.redo.bind(this)}>
                        <Text style={{color: 'white'}}>重做</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.button} onPress={this.changePrimitive.bind(this, 'marks')}>
                        <Text style={{color: 'white'}}>添加标注</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.button} onPress={this.changePrimitive.bind(this, 'hidemark')}>
                        <Text style={{color: 'white'}}>{
                            this.state.canvas.primitives.filter(p=>{
                                return p.primitive == "marks" && p.visible
                            })?.length > 0 ? "隐藏标注" : "显示标注"
                            }</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.button} onPress={this.changePrimitive.bind(this, 'window')}>
                        <Text style={{color: 'white'}}>添加窗户</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.button} onPress={this.changePrimitive.bind(this, 'door')}>
                        <Text style={{color: 'white'}}>添加一扇门</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.button} onPress={this.changePrimitive.bind(this, 'background')}>
                        <Text style={{color: 'white'}}>添加背景图片</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.button} onPress={this.changePrimitive.bind(this, 'line')}>
                        <Text style={{color: this.state.drawingPrimitiveType == 'line' ? '#1DFF58' : 'white'}}>画直线</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.button} onPress={this.changePrimitive.bind(this, 'polygon 4')}>
                        <Text style={{color: this.state.drawingPrimitiveType == 'polygon 4' ? '#1DFF58' : 'white'}}>画四边形</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.button} onPress={this.changePrimitive.bind(this, 'angle')}>
                    <Text style={{color: this.state.drawingPrimitiveType == 'angle' ? '#1DFF58' : 'white'}}>标注角度</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.button} onPress={this.saveSVGToPNG.bind(this)}>
                    <Text style={{color: 'white'}}>导出成图片</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.button} onPress={this.saveSVG.bind(this)}>
                    <Text style={{color: 'white'}}>保存文件</Text>
                    </TouchableOpacity>
                    
                    </View>
                </View> */}
                <Modal transparent={true} visible={this.state.polyvisible} animationType="fade" onRequestClose={()=>{
                    this.setState({
                        polyvisible: false
                    })
                }}>
                    <View style={{backgroundColor: "rgba(0,0,0,0.3)", flex: 1, justifyContent: 'flex-end', position: 'absolute', top: 0, left: 0, right: 0, bottom: 0}}>
                        <KeyboardAvoidingView style={{
                            backgroundColor: '#1B1B1B',
                            borderTopLeftRadius: 36,
                            borderTopRightRadius: 36,
                            paddingBottom: 34,
                            width: "100%"
                        }}>
                            <View style={{
                                flexDirection: 'row',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                marginTop: 28,
                                paddingLeft: 27,
                                paddingRight: 27
                            }}>
                                <View style={{
                                    width: 24,
                                    height: 24
                                }}/>
                                <Text style={{
                                    color: "white",
                                    fontSize: 16,
                                    fontWeight: '600'
                                }}>Common graphics</Text>
                                <TouchableOpacity onPress={()=>{
                                    this.setState({
                                        polyvisible: false
                                    })
                                }}>
                                    <Image source={require('../../assets/Canvas/close.png')} style={{
                                        width: 18,
                                        height: 18
                                    }}/>
                                </TouchableOpacity>
                            </View>
                            <View style={{
                                flexDirection: 'row',
                                flexWrap: 'wrap',
                                marginLeft: (width - 312) / 2 - 17,
                                width: 312,
                                marginTop: 16
                            }}>
                                <TouchableOpacity style={{marginTop: 26, marginLeft: 34}} onPress={this.changePolygonType.bind(this, '3')}>
                                        <Image style={{
                                            width: 44, height: 44
                                        }} source={require('../../assets/Canvas/Polygon/polygon3.png')}/>
                                </TouchableOpacity>
                                <TouchableOpacity style={{marginTop: 26, marginLeft: 34}} onPress={this.changePolygonType.bind(this, '4')}>
                                        <Image style={{
                                            width: 44, height: 44
                                        }} source={require('../../assets/Canvas/Polygon/polygon4.png')}/>
                                </TouchableOpacity>
                                <TouchableOpacity style={{marginTop: 26, marginLeft: 34}} onPress={this.changePolygonType.bind(this, '41')}>
                                        <Image style={{
                                            width: 44, height: 44
                                        }} source={require('../../assets/Canvas/Polygon/polygon41.png')}/>
                                </TouchableOpacity>
                                <TouchableOpacity style={{marginTop: 26, marginLeft: 34}} onPress={this.changePolygonType.bind(this, '42')}>
                                        <Image style={{
                                            width: 44, height: 44
                                        }} source={require('../../assets/Canvas/Polygon/polygon42.png')}/>
                                </TouchableOpacity>
                                <TouchableOpacity style={{marginTop: 26, marginLeft: 34}} onPress={this.changePolygonType.bind(this, '43')}>
                                        <Image style={{
                                            width: 44, height: 44
                                        }} source={require('../../assets/Canvas/Polygon/polygon43.png')}/>
                                </TouchableOpacity>
                                <TouchableOpacity style={{marginTop: 26, marginLeft: 34}} onPress={this.changePolygonType.bind(this, '5')}>
                                        <Image style={{
                                            width: 44, height: 44
                                        }} source={require('../../assets/Canvas/Polygon/polygon5.png')}/>
                                </TouchableOpacity>
                                <TouchableOpacity style={{marginTop: 26, marginLeft: 34}} onPress={this.changePolygonType.bind(this, '6')}>
                                        <Image style={{
                                            width: 44, height: 44
                                        }} source={require('../../assets/Canvas/Polygon/polygon6.png')}/>
                                </TouchableOpacity>
                                <TouchableOpacity style={{marginTop: 26, marginLeft: 34}} onPress={this.changePolygonType.bind(this, '8')}>
                                        <Image style={{
                                            width: 44, height: 44
                                        }} source={require('../../assets/Canvas/Polygon/polygon8.png')}/>
                                </TouchableOpacity>
                                <TouchableOpacity style={{marginTop: 26, marginLeft: 34}} onPress={this.changePolygonType.bind(this, '10')}>
                                        <Image style={{
                                            width: 44, height: 44
                                        }} source={require('../../assets/Canvas/Polygon/polygon10.png')}/>
                                </TouchableOpacity>
                                <TouchableOpacity style={{marginTop: 26, marginLeft: 34}} onPress={this.changePolygonType.bind(this, '12')}>
                                        <Image style={{
                                            width: 44, height: 44
                                        }} source={require('../../assets/Canvas/Polygon/polygon12.png')}/>
                                </TouchableOpacity>
                                <TouchableOpacity onPress={this.changePrimitive.bind(this, 'curve')} style={{marginTop: 26, marginLeft: 34}}>
                                    <Image source={this.state.drawingPrimitiveType == 'curve' ? require('../../assets/Canvas/random_sel.png') : require('../../assets/Canvas/random.png')} style={{
                                        width: 44, height: 44
                                    }}/>
                                </TouchableOpacity>
                            </View>
                        </KeyboardAvoidingView>
                </View>
                </Modal>
                <Modal transparent={true} visible={this.state.markvisible} animationType="fade" onRequestClose={()=>{
                    this.setState({
                        markvisible: false
                    })
                }}>
                    <View style={{backgroundColor: "rgba(0,0,0,0.3)", flex: 1, justifyContent: 'flex-end', position: 'absolute', top: 0, left: 0, right: 0, bottom: 0}}>
                        <KeyboardAvoidingView style={{
                            backgroundColor: '#1B1B1B',
                            borderTopLeftRadius: 36,
                            borderTopRightRadius: 36,
                            height: 238,
                            width: "100%"
                        }}>
                            <View style={{
                                flexDirection: 'row',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                marginTop: 28,
                                paddingLeft: 27,
                                paddingRight: 27
                            }}>
                                <View style={{
                                    width: 24,
                                    height: 24
                                }}/>
                                <Text style={{
                                    color: "white",
                                    fontSize: 16,
                                    fontWeight: '600'
                                }}>自定义</Text>
                                <TouchableOpacity onPress={()=>{
                                    this.setState({
                                        markvisible: false
                                    })
                                }}>
                                    <Image source={require('../../assets/Canvas/close.png')} style={{
                                        width: 18,
                                        height: 18
                                    }}/>
                                </TouchableOpacity>
                            </View>
                            <Text style={{
                                marginTop: 23,
                                color: "#666666",
                                fontSize: 12,
                                marginLeft: 16,
                            }}>Data</Text>
                            <View style={{
                                marginLeft: 16,
                                marginRight: 16,
                                height: 50,
                                backgroundColor: '#141414',
                                marginLeft: 16,
                                marginRight: 16,
                                height: 50,
                                justifyContent: 'center',
                                paddingLeft: 20,
                                marginTop: 8,
                                borderColor: '#434343', borderWidth: 0.5,borderRadius: 5
                            }}>
                                <TextInput value={this.state.mark} onChangeText={(text)=>{
                                    this.setState({
                                        mark: text
                                    })
                                }} placeholder="请输入标注" placeholderTextColor={"#999999"} style={{
                                    fontSize: 14, color: 'white'
                                }}/>
                            </View>
                            <TouchableOpacity style={{
                                marginTop: 21,
                                marginLeft: 23,
                                marginRight: 23,
                                alignItems: 'center',
                                justifyContent: 'center',
                                height: 48,
                                borderRadius: 8,
                                alignItems: 'center',
                                justifyContent: 'center'
                            }} onPress={async ()=>{
                                let marks = await StorageUtil.get("marks")
                                if (marks) {
                                    let m = this.state.mark
                                    let target = marks.find(ddd=>{
                                        return ddd == m
                                    })
                                    if (target == undefined) {
                                        marks = [...marks, this.state.mark]
                                    }
                                } else {
                                    marks = [this.state.mark]
                                }
                                StorageUtil.save("marks", marks)
                                this.saveCanvasForRedoUndo();
                                let editingMark = this.state.canvas.primitives.find(p=>{
                                    return p.editing && p.primitive == "marks" && p.visible
                                })
                                if (editingMark) {
                                    editingMark.marks = this.state.mark
                                    this.setState({
                                        marks: marks,
                                        canvas: this.state.canvas,
                                        drawingPrimitiveType: "",
                                        markvisible: false
                                    },()=>{
                                        this.addARedoUndoRecord()
                                    })
                                }
                            }}>
                                <ImageBackground source={require('../../assets/Canvas/confirm_btn.png')} style={{
                                    width: 328, height: 48,
                                    alignItems: 'center', justifyContent: 'center'
                                }}>
                                </ImageBackground>
                            </TouchableOpacity>
                            
                        </KeyboardAvoidingView>
                </View>
                </Modal>

                <Modal transparent={true} visible={this.state.linemarkvisible} animationType="fade" onRequestClose={()=>{
                    this.setState({
                        linemarkvisible: false
                    })
                }}>
                    <View style={{backgroundColor: "rgba(0,0,0,0.3)", flex: 1, justifyContent: 'flex-end', position: 'absolute', top: 0, left: 0, right: 0, bottom: 0}}>
                        <KeyboardAvoidingView style={{
                            backgroundColor: '#1B1B1B',
                            borderTopLeftRadius: 36,
                            borderTopRightRadius: 36,
                            height: 410,
                            width: "100%"
                        }}>
                            <View style={{
                                flexDirection: 'row',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                marginTop: 28,
                                paddingLeft: 27,
                                paddingRight: 27
                            }}>
                                <View style={{
                                    width: 24,
                                    height: 24
                                }}/>
                                <Text style={{
                                    color: "white",
                                    fontSize: 16,
                                    fontWeight: '600'
                                }}>自定义</Text>
                                <TouchableOpacity onPress={()=>{
                                    this.setState({
                                        linemarkvisible: false
                                    })
                                }}>
                                    <Image source={require('../../assets/Canvas/close.png')} style={{
                                        width: 18,
                                        height: 18
                                    }}/>
                                </TouchableOpacity>
                            </View>
                            <Text style={{
                                marginTop: 23,
                                color: "#666666",
                                fontSize: 12,
                                marginLeft: 16,
                            }}>{"Length (m)"}</Text>
                            <View style={{
                                marginLeft: 16,
                                marginRight: 16,
                                height: 50,
                                justifyContent: 'center',
                                paddingLeft: 20,
                                marginTop: 8,
                                backgroundColor: "#141414",
                                borderWidth: 0.5,
                                borderColor: "#434343",
                                borderRadius: 5,
                            }}>
                                <TextInput value={this.state.linemark} onChangeText={(text)=>{
                                    let newText = (text != '' && text.substr(0,1) == '.') ? '' : text;
                                    newText = newText.replace(/^0+[0-9]+/g, "0"); //不能以0开头输入
                                    newText = newText.replace(/[^\d.]/g,""); //清除"数字"和"."以外的字符
                                    newText = newText.replace(/\.{2,}/g,"."); //只保留第一个, 清除多余的
                                    newText  = newText.replace(".","$#$").replace(/\./g,"").replace("$#$",".");
                                    newText = newText.replace(/^(\-)*(\d+)\.(\d\d).*$/,'$1$2.$3'); //只能输入两个小数
                                    this.setState({
                                        linemark: newText
                                    })
                                }} placeholder="请输入长度，单位m" placeholderTextColor={"#999999"} style={{
                                    fontSize: 14, color: 'white'
                                }} keyboardType='numeric'/>
                            </View>
                            <TouchableOpacity style={{
                                marginTop: 32,
                                flexDirection: 'row',
                                marginLeft: 17
                            }} onPress={()=>{
                                this.setState({
                                    usecurve: !this.state.usecurve
                                })
                            }}>
                                <Image source={this.state.usecurve ? require('../../assets/Canvas/ratio_select.png') : require('../../assets/Canvas/ratio.png')} style={{
                                    width: 20,
                                    height: 20
                                }}/>
                                <Text style={{
                                    marginLeft: 14,
                                    color: 'white',
                                    fontSize: 16,
                                    fontWeight: '600'
                                }}>curve</Text>
                            </TouchableOpacity>
                            {this.state.usecurve ? <View style={{
                            }}>
                                <Text style={{
                                marginTop: 23,
                                color: "#666666",
                                fontSize: 12,
                                marginLeft: 16
                            }}>{"height (m)"}</Text>
                            <View style={{marginTop: 8, flexDirection: 'row', alignItems: 'center'}}>
                            <View style={{
                                marginLeft: 16,
                                marginRight: 16,
                                height: 50,
                                width: 162,
                                backgroundColor: "#141414",
                                borderWidth: 0.5,
                                borderColor: "#434343",
                                borderRadius: 5,
                                justifyContent: 'center',
                                paddingLeft: 20,
                                marginTop: 8
                            }}>
                                <TextInput value={this.state.lineheight} onChangeText={(text)=>{
                                    let newText = (text != '' && text.substr(0,1) == '.') ? '' : text;
                                    newText = newText.replace(/^0+[0-9]+/g, "0"); //不能以0开头输入
                                    newText = newText.replace(/[^\d.]/g,""); //清除"数字"和"."以外的字符
                                    newText = newText.replace(/\.{2,}/g,"."); //只保留第一个, 清除多余的
                                    newText  = newText.replace(".","$#$").replace(/\./g,"").replace("$#$",".");
                                    newText = newText.replace(/^(\-)*(\d+)\.(\d\d).*$/,'$1$2.$3'); //只能输入两个小数
                                    this.setState({
                                        lineheight: newText
                                    })
                                }} placeholder="请输入长度" placeholderTextColor={"#999999"} style={{
                                    fontSize: 14, color: 'white'
                                }} keyboardType='numeric'/>
                            </View>
                            <TouchableOpacity style={{
                                flexDirection: 'row',
                                marginLeft: 8
                            }} onPress={()=>{
                                this.setState({
                                    heightoutter: !this.state.heightoutter
                                })
                            }}>
                                <Image style={{
                                    width: 50,
                                    height: 50
                                }} source={this.state.heightoutter ? require('../../assets/Canvas/curvedown.png') : require('../../assets/Canvas/curveupper.png')}/>
                            </TouchableOpacity>
                            </View>
                            </View> : null}
                            <TouchableOpacity style={{
                                marginTop: 21,
                                marginLeft: 23,
                                marginRight: 23,
                                alignItems: 'center',
                                justifyContent: 'center',
                                height: 48,
                                borderRadius: 8,
                                alignItems: 'center',
                                justifyContent: 'center'
                            }} onPress={async ()=>{
                                let editingLine = this.state.canvas.primitives.find(d=>{
                                    return d.primitive == 'line' && d.editing
                                })
                                if (editingLine) {
                                    let marks;
                                    let shouldAddRedo = false
                                    if (this.state.linemark?.length > 0) {
                                        let currentMarks = editingLine.marks;
                                        let width = 10 + (this.state.linemark + "m").length * 6
                                        marks = {
                                            text: this.state.linemark + "m",
                                            width: width,
                                            height: 10,
                                            visible: true
                                        }
                                        if (currentMarks?.text != marks.text) {
                                            shouldAddRedo = true
                                        }
                                        if (shouldAddRedo) {
                                            this.saveCanvasForRedoUndo()
                                        }
                                        editingLine.marks = marks
                                    }
                                    if (this.state.usecurve) {
                                        if (this.state.lineheight == "" || this.state.lineheight == 0) {
                                            Toast.show({
                                                type: 'error',
                                                text1: '请输入曲线高度'
                                            })
                                            return
                                        }
                                        let height;
                                        if (this.state.heightoutter) {
                                            height = parseFloat(this.state.lineheight).toFixed(2)
                                        } else {
                                            height = -parseFloat(this.state.lineheight).toFixed(2)
                                        }
                                        let originheight = height
                                        //根据比例计算高度
                                        let x1 = editingLine.points[0].x
                                        let y1 = editingLine.points[0].y
                                        let x2 = editingLine.points[1].x
                                        let y2 = editingLine.points[1].y
                                        let linelength = Math.sqrt((x1 - x2) * (x1 - x2) + (y1 - y2) * (y1 - y2))
                                        // extractNumbers
                                        let numbers = this.extractNumbers(this.state.linemark)
                                        if (numbers.length == 0) {
                                            return
                                        }
                                        let number = numbers[0]
                                        if (Math.abs(height) > number / 2) {
                                            //起拱高度最多是长度的一半
                                            Toast.show({
                                                type: 'error',
                                                text1: '高度最多是长度的一半'
                                            })
                                            console.log("高度最多是长度的一半")
                                            return
                                        }
                                        height = linelength / number * height
                                        // console.log("height hh is " + height)
                                        let thirdPoint = editingLine.thirdPoint
                                        let calculatedThirdPoint = this.getPerpendicularPoint(x1, y1, x2, y2, height)
                                        // console.log("calculated third point is ")
                                        // console.log(calculatedThirdPoint)
                                        let circle = this.getCircleInfo(editingLine.points[0], editingLine.points[1], calculatedThirdPoint)
                                        if (thirdPoint?.x != calculatedThirdPoint.x || thirdPoint?.y != calculatedThirdPoint.y) {
                                            shouldAddRedo = true
                                            this.saveCanvasForRedoUndo()
                                        }
                                        editingLine.thirdPoint = {...calculatedThirdPoint, ...circle, h: originheight}
                                        this.setState({
                                            canvas: this.state.canvas,
                                            linemarkvisible: false
                                        },()=>{
                                            if (shouldAddRedo) {
                                                this.addARedoUndoRecord();
                                            }
                                        })
                                    } else {
                                        if (editingLine.thirdPoint) {
                                            shouldAddRedo = true
                                            this.saveCanvasForRedoUndo();
                                            editingLine.thirdPoint = null;
                                        }
                                        this.setState({
                                            canvas: this.state.canvas,
                                            linemarkvisible: false
                                        },()=>{
                                            if (shouldAddRedo) {
                                                this.saveCanvasForRedoUndo()
                                            }
                                        })
                                    }
                                }
                                let linemarks = this.state.linemarks
                                // let linemarks = await StorageUtil.get("linemarks")
                                if (linemarks) {
                                    let m = this.state.linemark + "m"
                                    let target = linemarks.find(mmm=>{
                                        return mmm == m
                                    })
                                    if (target == undefined) {
                                        linemarks = [...linemarks, this.state.linemark + "m"]
                                    }
                                } else {
                                    linemarks = [this.state.linemark + "m"]
                                }
                                StorageUtil.save("linemarks", linemarks)
                                this.setState({
                                    linemarks: linemarks
                                })
                            }}>
                                <ImageBackground source={require('../../assets/Canvas/confirm_btn.png')} style={{
                                    width: 328, height: 48,
                                    alignItems: 'center', justifyContent: 'center'
                                }}>
                                </ImageBackground>
                            </TouchableOpacity>
                        </KeyboardAvoidingView>
                </View>
                </Modal>

                <Modal transparent={true} visible={this.state.windowvisible} animationType="fade" onRequestClose={()=>{
                    this.setState({
                        windowvisible: false
                    })
                }}>
                    <View style={{backgroundColor: "rgba(0,0,0,0.3)", flex: 1, justifyContent: 'flex-end', position: 'absolute', top: 0, left: 0, right: 0, bottom: 0}}>
                        <KeyboardAvoidingView style={{
                            backgroundColor: '#1B1B1B',
                            borderTopLeftRadius: 36,
                            borderTopRightRadius: 36,
                            height: 260,
                            width: "100%"
                        }}>
                            <View style={{
                                flexDirection: 'row',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                marginTop: 28,
                                paddingLeft: 27,
                                paddingRight: 27
                            }}>
                                <View style={{
                                    width: 24,
                                    height: 24
                                }}/>
                                <Text style={{
                                    color: "white",
                                    fontSize: 16,
                                    fontWeight: '600'
                                }}>自定义</Text>
                                <TouchableOpacity onPress={()=>{
                                    this.setState({
                                        windowvisible: false
                                    })
                                }}>
                                    <Image source={require('../../assets/Canvas/close.png')} style={{
                                        width: 18,
                                        height: 18
                                    }}/>
                                </TouchableOpacity>
                            </View>
                            <View style={{
                                marginTop: 23,
                                flexDirection: 'row',
                                marginLeft: 16
                            }}>
                            <View style={{flex: 1}}>
                            <Text style={{
                                color: "#666666",
                                fontSize: 12,
                            }}>{"length"}</Text>
                            <View style={{
                                height: 50,
                                justifyContent: 'center',
                                paddingLeft: 20,
                                marginTop: 8,
                                backgroundColor: "#141414",
                                borderWidth: 0.5,
                                borderColor: "#434343",
                                borderRadius: 5,
                            }}>
                                <TextInput value={this.state.windowwidth} onChangeText={(text)=>{
                                    let newText = (text != '' && text.substr(0,1) == '.') ? '' : text;
                                    newText = newText.replace(/^0+[0-9]+/g, "0"); //不能以0开头输入
                                    newText = newText.replace(/[^\d.]/g,""); //清除"数字"和"."以外的字符
                                    newText = newText.replace(/\.{2,}/g,"."); //只保留第一个, 清除多余的
                                    newText  = newText.replace(".","$#$").replace(/\./g,"").replace("$#$",".");
                                    newText = newText.replace(/^(\-)*(\d+)\.(\d\d).*$/,'$1$2.$3'); //只能输入两个小数
                                    this.setState({
                                        windowwidth: newText
                                    })
                                }} placeholder="请输入长度，单位m" placeholderTextColor={"#999999"} style={{
                                    fontSize: 14, color: 'white'
                                }} keyboardType='numeric'/>
                            </View>
                            </View>

                            <View style={{flex: 1, marginLeft: 16, marginRight: 16}}>
                            <Text style={{
                                color: "#666666",
                                fontSize: 12,
                            }}>{"height"}</Text>
                            <View style={{
                                height: 50,
                                justifyContent: 'center',
                                paddingLeft: 20,
                                marginTop: 8,
                                backgroundColor: "#141414",
                                borderWidth: 0.5,
                                borderColor: "#434343",
                                borderRadius: 5,
                            }}>
                                <TextInput value={this.state.windowheight} onChangeText={(text)=>{
                                    let newText = (text != '' && text.substr(0,1) == '.') ? '' : text;
                                    newText = newText.replace(/^0+[0-9]+/g, "0"); //不能以0开头输入
                                    newText = newText.replace(/[^\d.]/g,""); //清除"数字"和"."以外的字符
                                    newText = newText.replace(/\.{2,}/g,"."); //只保留第一个, 清除多余的
                                    newText  = newText.replace(".","$#$").replace(/\./g,"").replace("$#$",".");
                                    newText = newText.replace(/^(\-)*(\d+)\.(\d\d).*$/,'$1$2.$3'); //只能输入两个小数
                                    this.setState({
                                        windowheight: newText
                                    })
                                }} placeholder="请输入高度，单位m" placeholderTextColor={"#999999"} style={{
                                    fontSize: 14, color: 'white'
                                }} keyboardType='numeric'/>
                            </View>
                            </View>
                            </View>
                            <TouchableOpacity style={{
                                marginTop: 21,
                                marginLeft: 23,
                                marginRight: 23,
                                alignItems: 'center',
                                justifyContent: 'center',
                                height: 48,
                                borderRadius: 8,
                                alignItems: 'center',
                                justifyContent: 'center'
                            }} onPress={async ()=>{
                                let line = this.state.canvas.primitives.find(d=>{
                                    return d.editing && d.primitive == 'line'
                                })
                                //要么都为空，要么都有数值
                                let widthnotempty = this.state.windowwidth && this.state.windowwidth.length > 0
                                let heightnotempty = this.state.windowheight && this.state.windowheight.length > 0
                                if (widthnotempty != heightnotempty) {
                                    Toast.show({
                                        type: "error",
                                        text1: "长度与高度必须同时输入或者同时为空"
                                    })
                                    return
                                }
                                this.saveCanvasForRedoUndo()
                                let x1 = line.points[0].x
                                let y1 = line.points[0].y
                                let x2 = line.points[1].x
                                let y2 = line.points[1].y
                                let centerx = (x1 + x2) / 2
                                let centery = (y1 + y2) / 2
                                let quadx = (x2 + centerx) / 2
                                let quady = (y2 + centery) / 2
                                let iconWidth = 22
                                let iconHeight = 22
                                let needaddredo = false;
                                let l = ""// = "L:" + this.state.windowwidth + "m"
                                let h = ""// = "H:" + this.state.windowheight + "m"
                                if (this.state.windowwidth) {
                                    l = "L:" + this.state.windowwidth + "m"
                                }
                                if (this.state.windowheight) {
                                    h = "H:" + this.state.windowheight + "m"
                                }
                                let window = line.windows?.find(window=>{
                                    return window.editing
                                })
                                if (window) {
                                    if (window.l != l || window.h != l) {
                                        needaddredo = true
                                    }
                                    window.l = l
                                    window.h = h
                                }
                                this.setState({
                                    canvas: this.state.canvas,
                                    windowvisible: false
                                },()=>{
                                    if (needaddredo) {
                                        this.addARedoUndoRecord()
                                    }
                                })
                            }}>
                                <ImageBackground source={require('../../assets/Canvas/confirm_btn.png')} style={{
                                    width: 328, height: 48,
                                    alignItems: 'center', justifyContent: 'center'
                                }}>
                                </ImageBackground>
                            </TouchableOpacity>
                        </KeyboardAvoidingView>
                </View>
                </Modal>

                <Modal transparent={true} visible={this.state.anglevisible} animationType="fade" onRequestClose={()=>{
                    this.state.canvas.primitives.forEach(p=>{
                        p.editing = false
                    })
                    this.setState({
                        anglevisible: false,
                        canvas: this.state.canvas
                    })
                }}>
                    <View style={{backgroundColor: "rgba(0,0,0,0.3)", flex: 1, justifyContent: 'flex-end', position: 'absolute', top: 0, left: 0, right: 0, bottom: 0}}>
                        <KeyboardAvoidingView style={{
                            backgroundColor: '#1B1B1B',
                            borderTopLeftRadius: 36,
                            borderTopRightRadius: 36,
                            height: 238,
                            width: "100%"
                        }}>
                            <View style={{
                                flexDirection: 'row',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                marginTop: 28,
                                paddingLeft: 27,
                                paddingRight: 27
                            }}>
                                <View style={{
                                    width: 24,
                                    height: 24
                                }}/>
                                <Text style={{
                                    color: "white",
                                    fontSize: 16,
                                    fontWeight: '600'
                                }}>夹角角度</Text>
                                <TouchableOpacity onPress={()=>{
                                    this.state.canvas.primitives.forEach(p=>{
                                        p.editing = false
                                    })
                                    this.setState({
                                        anglevisible: false,
                                        canvas: this.state.canvas
                                    })
                                }}>
                                    <Image source={require('../../assets/Canvas/close.png')} style={{
                                        width: 18,
                                        height: 18
                                    }}/>
                                </TouchableOpacity>
                            </View>
                            <Text style={{
                                marginTop: 23,
                                color: "#666666",
                                fontSize: 12,
                                marginLeft: 16,
                            }}>Angle</Text>
                            <View style={{
                                marginLeft: 16,
                                marginRight: 16,
                                height: 50,
                                justifyContent: 'center',
                                paddingLeft: 20,
                                marginTop: 8,
                                backgroundColor: "#141414",
                                borderWidth: 0.5,
                                borderColor: "#434343",
                                borderRadius: 5,
                            }}>
                                <TextInput value={this.state.angle} onChangeText={(e)=>{
                                    const numericInput = e.replace(/[^0-9]/g, '');
                                    this.setState({
                                        angle: numericInput
                                    })
                                }} placeholder="请输入0-360之间的数字" placeholderTextColor={"#999999"} style={{
                                    fontSize: 14, color: 'white'
                                }} keyboardType='numeric'/>
                            </View>
                            <TouchableOpacity style={{
                                marginTop: 21,
                                marginLeft: 23,
                                marginRight: 23,
                                alignItems: 'center',
                                justifyContent: 'center',
                                height: 48,
                                borderRadius: 8,
                                alignItems: 'center',
                                justifyContent: 'center'
                            }} onPress={async ()=>{
                                if (!this.state.angle || this.state.angle?.length == 0) {
                                    return
                                }
                                let choosedLines = this.state.canvas.primitives.filter(p=>{
                                    return p.editing && p.primitive == 'line'
                                })
                                let angle = {
                                    id: this.guid(),
                                    primitive: 'angle',
                                    line1id: choosedLines[0].id,
                                    line2id: choosedLines[1].id,
                                    angle: this.state.angle,
                                    editing: true
                                }
                                if (choosedLines.length == 2) {
                                    let samelineangles = this.state.canvas.primitives.filter(p=>{
                                        let sameline = (p.line1id == angle.line1id && p.line2id == angle.line2id) || (p.line2id == angle.line1id && p.line1id == angle.line2id)
                                        return p.primitive == 'angle' && sameline
                                    })
                                    let sameangle;
                                    if (samelineangles.length > 0) {
                                        sameangle = samelineangles[0]
                                    }
                                    if (sameangle) {
                                        this.cancelEditing()
                                        if (sameangle.angle == angle.angle) {
                                            this.setState({
                                                canvas: this.state.canvas,
                                                anglevisible: false,
                                                drawingPrimitiveType: ''
                                            })
                                            return
                                        } else {
                                            sameangle.angle = angle.angle;
                                            let angles = this.state.angles
                                            let sameang = angles.find(a=>{
                                                return a == angle.angle
                                            })
                                            if (!sameang) {
                                                angles = [...angles, angle.angle]
                                                StorageUtil.save("angles", angles)
                                            }
                                            this.setState({
                                                canvas: this.state.canvas,
                                                anglevisible: false,
                                                angles: angles,
                                                drawingPrimitiveType: ''
                                            },()=>{
                                                this.addARedoUndoRecord()
                                            })
                                        }
                                    } else {
                                        let primitives = [...this.state.canvas.primitives, angle]
                                        this.cancelEditing()
                                        this.state.canvas.primitives = primitives;
                                        let angles = this.state.angles
                                            let sameang = angles.find(a=>{
                                                return a == angle.angle
                                            })
                                            if (!sameang) {
                                                angles = [...angles, angle.angle]
                                                StorageUtil.save("angles", angles)
                                            }
                                        this.setState({
                                            canvas: this.state.canvas,
                                            anglevisible: false,
                                            angles: angles,
                                            drawingPrimitiveType: ''
                                        },()=>{
                                            this.addARedoUndoRecord()
                                        })
                                    }
                                } else {
                                    let choosedAngle = this.state.canvas.primitives.find(p=>{
                                        return p.editing && p.primitive == 'angle'
                                    })
                                    let shouldAddRedo = false
                                    if (choosedAngle.angle != this.state.angle) {
                                        shouldAddRedo = true
                                        this.saveCanvasForRedoUndo()
                                    }
                                    choosedAngle.angle = this.state.angle
                                    let angles = this.state.angles
                                            let sameang = angles.find(a=>{
                                                return a == this.state.angle
                                            })
                                            if (!sameang) {
                                                angles = [...angles, angle.angle]
                                                StorageUtil.save("angles", angles)
                                            }
                                    this.setState({
                                        canvas: this.state.canvas,
                                        angles: angles,
                                        anglevisible: false
                                    },()=>{
                                        if (shouldAddRedo) {
                                            this.addARedoUndoRecord()
                                        }
                                    })
                                }
                            }}>
                                <ImageBackground source={require('../../assets/Canvas/confirm_btn.png')} style={{
                                    width: 328, height: 48,
                                    alignItems: 'center', justifyContent: 'center'
                                }}>
                                </ImageBackground>
                            </TouchableOpacity>
                        </KeyboardAvoidingView>
                </View>
                </Modal>

                <Modal transparent={true} visible={this.state.doorvisible} animationType="fade" onRequestClose={()=>{
                    this.setState({
                        doorvisible: false
                    })
                }}>
                    <View style={{backgroundColor: "rgba(0,0,0,0.3)", flex: 1, justifyContent: 'flex-end', position: 'absolute', top: 0, left: 0, right: 0, bottom: 0}}>
                        <KeyboardAvoidingView style={{
                            backgroundColor: '#1B1B1B',
                            borderTopLeftRadius: 36,
                            borderTopRightRadius: 36,
                            height: 370,
                            width: "100%"
                        }}>
                            <View style={{
                                flexDirection: 'row',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                marginTop: 28,
                                paddingLeft: 27,
                                paddingRight: 27
                            }}>
                                <View style={{
                                    width: 24,
                                    height: 24
                                }}/>
                                <Text style={{
                                    color: "white",
                                    fontSize: 16,
                                    fontWeight: '600'
                                }}>自定义</Text>
                                <TouchableOpacity onPress={()=>{
                                    this.setState({
                                        doorvisible: false
                                    })
                                }}>
                                    <Image source={require('../../assets/Canvas/close.png')} style={{
                                        width: 18,
                                        height: 18
                                    }}/>
                                </TouchableOpacity>
                            </View>
                            <View style={{
                                marginTop: 23,
                                flexDirection: 'row',
                                marginLeft: 16
                            }}>
                            <View style={{flex: 1}}>
                            <Text style={{
                                color: "#666666",
                                fontSize: 12,
                            }}>{"length"}</Text>
                            <View style={{
                                height: 50,
                                justifyContent: 'center',
                                paddingLeft: 20,
                                marginTop: 8,
                                backgroundColor: "#141414",
                                borderWidth: 0.5,
                                borderColor: "#434343",
                                borderRadius: 5,
                            }}>
                                <TextInput value={this.state.doorwidth} onChangeText={(text)=>{
                                    let newText = (text != '' && text.substr(0,1) == '.') ? '' : text;
                                    newText = newText.replace(/^0+[0-9]+/g, "0"); //不能以0开头输入
                                    newText = newText.replace(/[^\d.]/g,""); //清除"数字"和"."以外的字符
                                    newText = newText.replace(/\.{2,}/g,"."); //只保留第一个, 清除多余的
                                    newText  = newText.replace(".","$#$").replace(/\./g,"").replace("$#$",".");
                                    newText = newText.replace(/^(\-)*(\d+)\.(\d\d).*$/,'$1$2.$3'); //只能输入两个小数
                                    this.setState({
                                        doorwidth: newText
                                    })
                                }} placeholder="请输入长度，单位m" placeholderTextColor={"#999999"} style={{
                                    fontSize: 14, color: "white"
                                }} keyboardType='numeric'/>
                            </View>
                            </View>

                            <View style={{flex: 1, marginLeft: 16, marginRight: 16}}>
                            <Text style={{
                                color: "#666666",
                                fontSize: 12,
                            }}>{"height"}</Text>
                            <View style={{
                                height: 50,
                                justifyContent: 'center',
                                paddingLeft: 20,
                                marginTop: 8,
                                backgroundColor: "#141414",
                                borderWidth: 0.5,
                                borderColor: "#434343",
                                borderRadius: 5,
                            }}>
                                <TextInput value={this.state.doorheight} onChangeText={(text)=>{
                                    let newText = (text != '' && text.substr(0,1) == '.') ? '' : text;
                                    newText = newText.replace(/^0+[0-9]+/g, "0"); //不能以0开头输入
                                    newText = newText.replace(/[^\d.]/g,""); //清除"数字"和"."以外的字符
                                    newText = newText.replace(/\.{2,}/g,"."); //只保留第一个, 清除多余的
                                    newText  = newText.replace(".","$#$").replace(/\./g,"").replace("$#$",".");
                                    newText = newText.replace(/^(\-)*(\d+)\.(\d\d).*$/,'$1$2.$3'); //只能输入两个小数
                                    this.setState({
                                        doorheight: newText
                                    })
                                }} placeholder="请输入高度，单位m" placeholderTextColor={"#999999"} style={{
                                    fontSize: 14, color: 'white'
                                }} keyboardType='numeric'/>
                            </View>
                            </View>
                            </View>
                            <Text style={{
                                color: "#666666",
                                fontSize: 12,
                                marginLeft: 16,
                                marginTop: 15
                            }}>{"rotate"}</Text>
                            <View style={{flexDirection: 'row', flexWrap: 'wrap', marginTop: 8, marginLeft: 8, marginRight: 16}}>
                                {[{
                                    id: 0,
                                    title: "Inward Left",
                                    icon: require("../../assets/Canvas/win1.png")
                                },{
                                    id: 3,
                                    title: "Inward Right",
                                    icon: require("../../assets/Canvas/win2.png")
                                }].map((state, index)=>{
                                    return <TouchableOpacity key={index.toString()} style={{
                                        flex: 1,
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        flexDirection: 'row',
                                        backgroundColor: '#777777',
                                        marginLeft: 8,
                                        borderRadius: 5,
                                    }} onPress={()=>{
                                        this.setState({
                                            doorstate: state.id
                                        })
                                    }}>
                                        
                                        <LinearGradient style={{flex: 1, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', height: 37,borderRadius: 5,}} start={{x: 0, y: 0}} end={{x: 0, y: 1}} colors={this.state.doorstate == state.id ? ["#488834","#265549","#193869"] : ["#3D3D3D","#3D3D3D"]}>
                                        {this.state.doorstate == state.id ? <Image source={require('../../assets/Canvas/check.png')} style={{
                                            width: 18,
                                            height: 18,
                                            marginRight: 10
                                        }}/> :  <View style={{
                                            backgroundColor: "#8D8D8D",
                                            width: 18,
                                            height: 18,
                                            borderRadius: 9,
                                            marginRight: 10
                                        }}/>}
                                        <Image tintColor={"white"} source={state.icon} style={{
                                            width: 11, height: 10
                                        }}/>
                                        <Text style={{
                                            color: "white",
                                            fontSize: 11,
                                            fontWeight: '600',
                                            marginLeft: 5
                                        }}>{state.title}</Text>
                                        </LinearGradient>
                                    </TouchableOpacity>
                                })}
                            </View>
                            <View style={{flexDirection: 'row', flexWrap: 'wrap', marginTop: 8, marginLeft: 8, marginRight: 16}}>
                            {[{
                                    id: 1,
                                    title: "Outward Left",
                                    icon: require("../../assets/Canvas/win3.png")
                                },{
                                    id: 2,
                                    title: "Outward Right",
                                    icon: require("../../assets/Canvas/win4.png")
                                }].map((state, index)=>{
                                    return <TouchableOpacity key={index.toString()} style={{
                                        flex: 1,
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        flexDirection: 'row',
                                        backgroundColor: '#777777',
                                        marginLeft: 8,
                                        borderRadius: 5,
                                    }} onPress={()=>{
                                        this.setState({
                                            doorstate: state.id
                                        })
                                    }}>
                                        
                                        <LinearGradient style={{flex: 1, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', height: 37,borderRadius: 5,}} start={{x: 0, y: 0}} end={{x: 0, y: 1}} colors={this.state.doorstate == state.id ? ["#488834","#265549","#193869"] : ["#3D3D3D","#3D3D3D"]}>
                                        {this.state.doorstate == state.id ? <Image source={require('../../assets/Canvas/check.png')} style={{
                                            width: 18,
                                            height: 18,
                                            marginRight: 10
                                        }}/> :  <View style={{
                                            backgroundColor: "#8D8D8D",
                                            width: 18,
                                            height: 18,
                                            borderRadius: 9,
                                            marginRight: 10
                                        }}/>}
                                        <Image tintColor={"white"} source={state.icon} style={{
                                            width: 11, height: 10
                                        }}/>
                                        <Text style={{
                                            color: "white",
                                            fontSize: 11,
                                            fontWeight: '600',
                                            marginLeft: 5
                                        }}>{state.title}</Text>
                                        </LinearGradient>
                                    </TouchableOpacity>
                                })}
                            </View>
                            <TouchableOpacity style={{
                                marginTop: 21,
                                marginLeft: 23,
                                marginRight: 23,
                                alignItems: 'center',
                                justifyContent: 'center',
                                height: 48,
                                borderRadius: 8,
                                alignItems: 'center',
                                justifyContent: 'center'
                            }} onPress={async ()=>{
                                let line = this.state.canvas.primitives.find(d=>{
                                    return d.editing && d.primitive == 'line'
                                })
                                let widthnotempty = this.state.doorwidth && this.state.doorwidth.length > 0
                                let heightnotempty = this.state.doorheight && this.state.doorheight.length > 0
                                if (widthnotempty != heightnotempty) {
                                    Toast.show({
                                        type: "error",
                                        text1: "长度与高度必须同时输入或者同时为空"
                                    })
                                    return
                                }
                                this.saveCanvasForRedoUndo()
                                let l;// = "L:" + this.state.doorwidth + "m"
                                let h;// = "H:" + this.state.doorheight + "m"
                                if (this.state.doorwidth && this.state.doorwidth.length > 0) {
                                    l = "L:" + this.state.doorwidth + "m"
                                }
                                if (this.state.doorheight && this.state.doorheight.length > 0) {
                                    h = "H:" + this.state.doorheight + "m"
                                }

                                if (this.state.doorwidth == "0" || this.state.doorwidth == "" || this.state.doorheight == "0" || this.state.doorheight == "") {
                                    this.setState({
                                        doorvisible: false
                                    })
                                    return
                                }
                                let needAddRedo = false
                                let editingDoor = line.doors?.find(door=>{
                                    return door.editing
                                })
                                if (editingDoor) {
                                    
                                    if (l != editingDoor.l || h != editingDoor.h || editingDoor.state != this.state.doorstate) {
                                        needAddRedo = true
                                    }
                                    editingDoor.l = l
                                    editingDoor.h = h
                                    editingDoor.state = this.state.doorstate
                                }
                                this.setState({
                                    canvas: this.state.canvas,
                                    doorvisible: false,
                                },()=>{
                                    if (needAddRedo) {
                                        this.addARedoUndoRecord()
                                    }
                                })
                            }}>
                                <ImageBackground source={require('../../assets/Canvas/confirm_btn.png')} style={{
                                    width: 328, height: 48,
                                    alignItems: 'center', justifyContent: 'center'
                                }}>
                                </ImageBackground>
                            </TouchableOpacity>
                            
                        </KeyboardAvoidingView>
                </View>
                </Modal>

                {/* <Modal transparent={true} visible={this.state.sharevisible} animationType="fade" onRequestClose={()=>{
                    this.setState({
                        sharevisible: false
                    })
                }}> */}
                {this.state.sharevisible ? <View style={{backgroundColor: "rgba(0,0,0,0.3)", flex: 1, justifyContent: 'flex-end', position: 'absolute', top: 0, left: 0, right: 0, bottom: 0}}>
                        <KeyboardAvoidingView style={{
                            backgroundColor: '#1B1B1B',
                            borderTopLeftRadius: 36,
                            borderTopRightRadius: 36,
                            height: 320,
                            width: "100%"
                        }}>
                            <View style={{
                                flexDirection: 'row',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                marginTop: 28,
                                paddingLeft: 27,
                                paddingRight: 27
                            }}>
                                <View style={{
                                    width: 24,
                                    height: 24
                                }}/>
                                <Text style={{
                                    color: "white",
                                    fontSize: 16,
                                    fontWeight: '600'
                                }}>Export and Share</Text>
                                <TouchableOpacity onPress={()=>{
                                    this.setState({
                                        sharevisible: false
                                    })
                                }}>
                                    <Image source={require('../../assets/Canvas/close.png')} style={{
                                        width: 18,
                                        height: 18
                                    }}/>
                                </TouchableOpacity>
                            </View>
                            <Text style={{
                                marginTop: 23,
                                color: "white",
                                fontSize: 16,
                                marginLeft: 16,
                            }}>File format</Text>
                            <View style={{
                                marginLeft: 16,
                                flexDirection: 'row',
                                marginTop: 14
                            }}>
                                <TouchableOpacity style={{
                                    width: 86, height: 38,
                                    borderWidth: 0.5,
                                    borderColor: '#A4A4A4',
                                    borderRadius: 8,
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }} onPress={()=>{
                                    this.setState({
                                        savedFileFormat: 0
                                    })
                                }}>
                                    {this.state.savedFileFormat == 0 ? <ImageBackground style={{
                                        width: 86, height: 38, alignItems: 'center', justifyContent: 'center'
                                    }} source={require("../../assets/Canvas/file_bg.png")}>
                                        <Text style={{
                                        fontSize: 14,
                                        color: 'white'
                                    }}>PNG</Text>
                                    </ImageBackground> : <Text style={{
                                        fontSize: 14,
                                        color: '#999999'
                                    }}>PNG</Text>}
                                </TouchableOpacity>

                                <TouchableOpacity style={{
                                    width: 86, height: 38,
                                    borderWidth: 0.5,
                                    borderColor: '#A4A4A4',
                                    borderRadius: 8,
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    marginLeft: 13
                                }} onPress={()=>{
                                    this.setState({
                                        savedFileFormat: 1
                                    })
                                }}>
                                    {this.state.savedFileFormat == 1 ? <ImageBackground style={{
                                        width: 86, height: 38, alignItems: 'center', justifyContent: 'center'
                                    }} source={require("../../assets/Canvas/file_bg.png")}>
                                        <Text style={{
                                        fontSize: 14,
                                        color: 'white'
                                    }}>PDF</Text>
                                    </ImageBackground> : <Text style={{
                                        fontSize: 14,
                                        color: '#999999'
                                    }}>PDF</Text>}
                                </TouchableOpacity>
                            </View>
                            <Text style={{
                                marginTop: 23,
                                color: "white",
                                fontSize: 16,
                                marginLeft: 16,
                            }}>Send To</Text>
                            <View style={{
                                marginLeft: 16,
                                flexDirection: 'row',
                                marginTop: 14
                            }}>
                                <TouchableOpacity onPress={()=>{
                                    if (this.state.savedFileFormat == 0) {
                                        this.saveSVGToPNG()
                                        this.setState({
                                            sharevisible: false
                                        })
                                    } else {
                                        this.saveSVGToPDF()
                                        this.setState({
                                            sharevisible: false
                                        })
                                    }
                                }}>
                                    <Image source={require("../../assets/Canvas/savelocally.png")} style={{
                                        width: 68,
                                        height: 68
                                    }}/>
                                </TouchableOpacity>

                                <TouchableOpacity style={{
                                    marginLeft: 34
                                }} onPress={()=>{
                                    if (this.state.savedFileFormat == 0) {
                                        this.emailPNG()
                                        this.setState({
                                            sharevisible: false
                                        })
                                    } else {
                                        this.emailPDF()
                                        this.setState({
                                            sharevisible: false
                                        })
                                    }
                                }}>
                                    <Image source={require("../../assets/Canvas/sendemail.png")} style={{
                                        width: 48,
                                        height: 69
                                    }}/>
                                </TouchableOpacity>
                            </View>
                        </KeyboardAvoidingView>
                    </View> : null}
                {/* </Modal> */}
                <ActionSheet
          ref={o => (this.ActionSheet = o)}
          onPress={index => {
            if (index == 0) {
            //   this.editPerson(this.state.currentUser);
            this.pickImageFromCamera()
            } else if (index == 1) {
              this.pickImageFromAubum()
            }
          }}
          options={['拍照', '从相册选取', '取消']}
          cancelButtonIndex={2}
        />
        <Modal transparent={true} visible={this.state.renameShow} animationType="fade" onRequestClose={()=>{
                    this.setState({
                        renameShow: false
                    })
                }}>
                    <View style={{backgroundColor: "rgba(0,0,0,0.3)", flex: 1, justifyContent: 'flex-end', position: 'absolute', top: 0, left: 0, right: 0, bottom: 0}}>
                        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{
                            backgroundColor: '#1B1B1B',
                            borderTopLeftRadius: 36,
                            borderTopRightRadius: 36,
                            height: 238,
                            width: "100%"
                        }}>
                            <View style={{
                                flexDirection: 'row',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                marginTop: 28,
                                paddingLeft: 27,
                                paddingRight: 27
                            }}>
                                <View style={{
                                    width: 24,
                                    height: 24
                                }}/>
                                <Text style={{
                                    color: "white",
                                    fontSize: 16,
                                    fontWeight: '600'
                                }}>Rename</Text>
                                <TouchableOpacity onPress={()=>{
                                    this.setState({
                                        renameShow: false
                                    })
                                }}>
                                    <Image source={require('../../assets/Canvas/close.png')} style={{
                                        width: 18,
                                        height: 18
                                    }}/>
                                </TouchableOpacity>
                            </View>
                            <Text style={{
                                marginTop: 23,
                                color: "#666666",
                                fontSize: 12,
                                marginLeft: 16,
                            }}>Title</Text>
                            <View style={{
                                marginLeft: 16,
                                marginRight: 16,
                                height: 50,
                                justifyContent: 'center',
                                paddingLeft: 20,
                                marginTop: 8,
                                backgroundColor: '#141414',
                                borderColor: '#434343', borderWidth: 0.5,borderRadius: 5
                            }}>
                                <TextInput value={this.state.editedTitle} onChangeText={async (e)=>{
                                    this.setState({
                                        editedTitle: e
                                    })
                                }} placeholderTextColor={"#999999"} style={{
                                    fontSize: 14, color: 'white'
                                }} keyboardType='numeric'/>
                            </View>
                            <TouchableOpacity style={{
                                marginTop: 21,
                                marginLeft: 23,
                                marginRight: 23,
                                alignItems: 'center',
                                justifyContent: 'center',
                                height: 48,
                                borderRadius: 8,
                                alignItems: 'center',
                                justifyContent: 'center'
                            }} onPress={async ()=>{
                                this.setState({
                                    title: this.state.editedTitle,
                                    renameShow: false
                                })
                                this.name = this.state.editedTitle
                                try {
                                    let list = await StorageUtil.get("docs")
                                    let self = list.find(f=>{
                                        return f.id == this.id
                                    })
                                    self.name = e
                                    StorageUtil.save('docs', list)
                                } catch {

                                }
                            }}>
                                <ImageBackground source={require('../../assets/Canvas/confirm_bg.png')} style={{
                                    width: 199, height: 42,
                                    alignItems: 'center', justifyContent: 'center'
                                }}>
                                <Text style={{
                                    fontSize: 14,
                                    color: '#333333',
                                    fontWeight: 'bold'
                                }}>确定</Text>
                                </ImageBackground>
                            </TouchableOpacity>
                            
                        </KeyboardAvoidingView>
                </View>
                </Modal>
        </SafeAreaView>
    }

    absorbToLine(x,y) {
        //支持直线吸附
        //支持多边形吸附
        let canAbsorbShapes = this.state.canvas.primitives.filter((command)=>{
            return command.primitive == 'line' && !command.draft
        })//找到当前画布所有已经画好的直线与多边形集合
        let points = []
        for (let index = 0; index < canAbsorbShapes.length; index++) {
            const shape = canAbsorbShapes[index];
            let ps = shape.points.map(p=>{
                let pv = this.convertSVGPointToScreen(p.x, p.y)
                return {svgPoint: p, viewPortPoint: pv, primitive: shape}
            })
            points = [...points, ...ps]
        }//所有顶点
        let clickPoint = {x: x, y: y}
        points.sort((p1, p2)=>{
            let dp1 = (p1.viewPortPoint.x - clickPoint.x) * (p1.viewPortPoint.x - clickPoint.x) + (p1.viewPortPoint.y - clickPoint.y) * (p1.viewPortPoint.y - clickPoint.y)
            let dp2 = (p2.viewPortPoint.x - clickPoint.x) * (p2.viewPortPoint.x - clickPoint.x) + (p2.viewPortPoint.y - clickPoint.y) * (p2.viewPortPoint.y - clickPoint.y)
            return dp1 - dp2
        })
        if (points.length > 0) {
            //要有吸附效果,吸附到最近的一条线段的端点
            let closestPoint = points[0];
            let distance = (closestPoint.viewPortPoint.x - clickPoint.x) * (closestPoint.viewPortPoint.x - clickPoint.x) + (closestPoint.viewPortPoint.y - clickPoint.y) * (closestPoint.viewPortPoint.y - clickPoint.y);
            if (distance <= this.absorbDistance) {
                //吸附
                return {x: closestPoint.svgPoint.x, y: closestPoint.svgPoint.y, absorb: true, primitive :closestPoint.primitive}
            }
        }
        let point = this.convertPointInViewToSVG(x, y)
        return {x: point.x, y: point.y, absorb: false}
    }

    guid() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            var r = Math.random() * 16 | 0,
                v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    saveCanvasForRedoUndo(){
        // console.log('old canvas is')
        // console.log(JSON.stringify(this.state.canvas))
        this.oldCanvas = JSON.parse(JSON.stringify(this.state.canvas))
        // console.log('保存了一下canvas:')
        // console.log(JSON.stringify(this.oldCanvas))
    }

    addARedoUndoRecord() {
        console.log("add a redo undo record")
        let canvas = JSON.parse(JSON.stringify(this.state.canvas))
        let oldStat = JSON.parse(JSON.stringify(this.oldCanvas))
        this.undoManager.add({
            undo: ()=>{
                this.setState({
                    canvas: oldStat
                })
            },
            redo: ()=>{
                this.setState({
                    canvas: canvas
                })
            }
        })
    }

    getPerpendicularPoint(x1, y1, x2, y2, distance) {
        // 计算中点坐标
        const xm = (x1 + x2) / 2;
        const ym = (y1 + y2) / 2;
        // 检查是否为垂直线
        if (x1 === x2) {
          // 直线是垂直的，返回上方坐标
          return { x: xm + distance, y: ym };
        }
      
        const deltaX = x2 - x1;
        const deltaY = y2 - y1;
        // 计算斜率
        if (deltaY == 0) {
            let point = { x: xm, y: ym + distance};
            return point
        }
        const slope = deltaY / deltaX;
        const perpendicularSlope = -1 / slope;
        
        // 计算单位向量
        const length = Math.sqrt(1 + perpendicularSlope * perpendicularSlope);
        const unitX = 1 / length; // 计算单位向量的x分量
        const unitY = perpendicularSlope / length; // 计算单位向量的y分量
        // 计算新坐标
        const xNew = xm + distance * unitX;
        const yNew = ym + distance * unitY;
        return { x: xNew, y: yNew };
      }

      getCircleInfo(p1, p2, p3) {
        const [A, B, C] = [p1, p2, p3];

    const x1 = A.x, y1 = A.y;
    const x2 = B.x, y2 = B.y;
    const x3 = C.x, y3 = C.y;
    const D = 2 * (x1 * (y2 - y3) + x2 * (y3 - y1) + x3 * (y1 - y2));

    if (D === 0) {
        throw new Error("The points are collinear and do not define a circle.");
    }

    const Ux = ((x1**2 + y1**2) * (y2 - y3) + (x2**2 + y2**2) * (y3 - y1) + (x3**2 + y3**2) * (y1 - y2)) / D;
    const Uy = ((x1**2 + y1**2) * (x3 - x2) + (x2**2 + y2**2) * (x1 - x3) + (x3**2 + y3**2) * (x2 - x1)) / D;

    const radius = Math.sqrt((Ux - x1)**2 + (Uy - y1)**2);

    return {
        // center: { : Ux, y: Uy },
        centerX: Ux,
        centerY: Uy,
        radius: radius
    };
      }

      // 函数：计算点P的极角，以最低点为原点
  polarAngle(p, lowest) {
    return Math.atan2(p.y - lowest.y, p.x - lowest.x);
  }
  
  // 函数：计算向量叉乘，决定三点(p1, p2, p3)的方向，判断是否左转或右转
  crossProduct(p1, p2, p3) {
    return (p2.x - p1.x) * (p3.y - p1.y) - (p2.y - p1.y) * (p3.x - p1.x);
  }
  
  // 函数：找到最低点（y值最小的点，若有多个取x值最小的）
  getLowestPoint(points) {
    return points.reduce((lowest, point) => {
      return point.y < lowest.y || (point.y === lowest.y && point.x < lowest.x) ? point : lowest;
    }, points[0]);
  }
  
  // 函数：Graham Scan算法，计算拟合多边形（凸包）
  grahamScan(points) {
    if (points.length < 3) return points;  // 如果点少于3个，直接返回点集
  
    const lowest = this.getLowestPoint(points); // 找到最低点
    const sortedPoints = points.slice().sort((a, b) => {
      const angleA = this.polarAngle(a, lowest);
      const angleB = this.polarAngle(b, lowest);
      return angleA - angleB;
    });
  
    // 初始化凸包栈
    const hull = [sortedPoints[0], sortedPoints[1]];
  
    // 遍历剩下的点
    for (let i = 2; i < sortedPoints.length; i++) {
      let top = hull.pop();
      while (hull.length > 0 && this.crossProduct(hull[hull.length - 1], top, sortedPoints[i]) <= 0) {
        top = hull.pop();
      }
      hull.push(top);
      hull.push(sortedPoints[i]);
    }
  
    return hull; // 返回拟合出的凸包多边形
  }

  simplifyPath(points, epsilon) {
    if (points.length < 3) return points;
  
    const getPerpendicularDistance = (point, lineStart, lineEnd) => {
      const dx = lineEnd.x - lineStart.x;
      const dy = lineEnd.y - lineStart.y;
      const mag = Math.sqrt(dx * dx + dy * dy);
      const distance = Math.abs(dy * point.x - dx * point.y + lineEnd.x * lineStart.y - lineEnd.y * lineStart.x) / mag;
      return distance;
    };
  
    let maxDistance = 0;
    let index = 0;
  
    for (let i = 1; i < points.length - 1; i++) {
      const distance = getPerpendicularDistance(points[i], points[0], points[points.length - 1]);
      if (distance > maxDistance) {
        index = i;
        maxDistance = distance;
      }
    }
  
    if (maxDistance > epsilon) {
      const leftSegment = this.simplifyPath(points.slice(0, index + 1), epsilon);
      const rightSegment = this.simplifyPath(points.slice(index), epsilon);
  
      return leftSegment.slice(0, leftSegment.length - 1).concat(rightSegment);
    } else {
      return [points[0], points[points.length - 1]];
    }
  }

  extractNumbers(input) {
    if (input == undefined) {
        return []
    }
    const regex = /\d+/g; // 匹配一个或多个数字
    return input.match(regex).map(Number); // 提取数字并转换为数字类型
  }
  
}

const styles = StyleSheet.create({
    button: {
        width: 100,
        height: 30,
        alignItems: 'center',
        justifyContent: 'center'
    },
    operateButton: {

    }
})
