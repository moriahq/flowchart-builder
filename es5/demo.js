

jsPlumbToolkitConnectorEditorsOrthogonal.initialize()

const START = "start"
const OUTPUT = "output"
const QUESTION = "question"
const ACTION = "action"
const SELECTABLE = "selectable"
const RESPONSE = "response"
const SOURCE = "source"
const TARGET = "target"


jsPlumbToolkitBrowserUIVanilla2.ready(() => {


// ------------------------- dialogs -------------------------------------

    const dialogs = jsPlumbToolkitDialogs.newInstance({

        dialogs: {
            "dlgText": {
                template: '<input type="text" size="50" jtk-focus jtk-att="text" value="${text}" jtk-commit="true"/>',
                title: 'Enter Text',
                cancelable: true
            },
            "dlgConfirm":{
                template:'${msg}',
                title:'Please Confirm',
                cancelable:true
            },
            "dlgMessage": {
                template:'${msg}',
                title:"Message",
                cancelable:false
            }
        }
    });

    function showEdgeEditDialog(data, continueFunction, abortFunction) {
        dialogs.show({
            id: "dlgText",
            data: {
                text: data.label || ""
            },
            onOK: function(data) {
                continueFunction({ label:data.text || "" })
            },
            onCancel:abortFunction
        })
    }

// ------------------------- / dialogs ----------------------------------

    // get the various dom elements
    const mainElement = document.querySelector("#jtk-demo-flowchart"),
        canvasElement = mainElement.querySelector(".jtk-demo-canvas"),
        miniviewElement = mainElement.querySelector(".miniview"),
        nodePalette = mainElement.querySelector(".node-palette"),
        controls = mainElement.querySelector(".controls");

    // Declare an instance of the Toolkit and supply a nodeFactory, used when adding new nodes, and a beforeConnect interceptor, used
    // to control what can be connected to what.
    const toolkit = jsPlumbToolkitBrowserUIVanilla2.newInstance({
        nodeFactory: function(type, data, continueCallback, abortCallback) {
            dialogs.show({
                id: "dlgText",
                title: "Enter " + type + " name:",
                onOK: function(d) {
                    data.text = d.text;
                    // if the user entered a name...
                    if (data.text && data.text.length >= 2) {
                        // and it was at least 2 chars
                        // set an id and continue.
                        data.id = jsPlumbUtil.uuid();
                        continueCallback(data);
                    }
                    else {
                        // else advise the user, and abort
                        alert(type + " names must be at least 2 characters!");
                        abortCallback();
                    }
                },
                onCancel:function() { abortCallback(); }
            });

            return true;
        },
        edgeFactory:function(type, data, continueCallback, abortCallback) {
            showEdgeEditDialog(data, continueCallback, abortCallback);
            return true;
        },
        beforeStartConnect:function(node, edgeType) {
            // limit edges from start node to 1. if any other type of node, return a payload for the edge.
            // if there is already a label set for the edge (say, if it was connected programmatically or via
            // edge undo/redo), this label is ignored.
            return (node.data.type === START && node.getEdges().length > 0) ? false : { label:"..." }
        }
    });

// ------------------------ / toolkit setup ------------------------------------

// ------------------------ rendering ------------------------------------

    const _editLabel = function(edge, deleteOnCancel) {
        dialogs.show({
            id: "dlgText",
            data: {
                text: edge.data.label || ""
            },
            onOK: function(data) {
                toolkit.updateEdge(edge, { label:data.text || "" })
            },
            onCancel:function() {
                if (deleteOnCancel) {
                    toolkit.removeEdge(edge)
                }
            }
        })
    }

    // Instruct the toolkit to render to the 'canvas' element. We pass in a view of nodes, edges and ports, which
    // together define the look and feel and behaviour of this renderer.  Note that we can have 0 - N renderers
    // assigned to one instance of the Toolkit..
    const renderer = toolkit.render(canvasElement, {
        view: {
            nodes: {
                start: {
                    templateId: "tmplStart"
                },
                selectable: {
                    events: {
                        tap: function(params) {
                            toolkit.toggleSelection(params.obj);
                        }
                    }
                },
                question: {
                    parent: "selectable",
                    templateId: "tmplQuestion"
                },
                action: {
                    parent: "selectable",
                    templateId: "tmplAction"
                },
                output:{
                    parent:"selectable",
                    templateId:"tmplOutput"
                }
            },
            // There are two edge types defined - 'yes' and 'no', sharing a common
            // parent.
            edges: {
                "default": {
                    anchor:"AutoDefault",
                    endpoint:"Blank",
                    connector: {type:"Orthogonal", options:{ cornerRadius: 3 } },
                    paintStyle: { strokeWidth: 2, stroke: "rgb(132, 172, 179)", outlineWidth: 3, outlineStroke: "transparent" },	//	paint style for this edge type.
                    hoverPaintStyle: { strokeWidth: 2, stroke: "rgb(67,67,67)" }, // hover paint style for this edge type.
                    events: {
                        click:function(p) {
                            edgeEditor.startEditing(p.edge, {
                                deleteButton:true,
                                onMaybeDelete:function(edge, connection, doDelete) {
                                    dialogs.show({
                                        id: "dlgConfirm",
                                        data: {
                                            msg: "Delete Edge"
                                        },
                                        onOK: doDelete
                                    });
                                }
                            })
                        }
                    },
                    overlays: [
                        { type:"Arrow", options:{ location: 1, width: 10, length: 10 }}
                    ]
                },
                response:{
                    parent:"default",
                    overlays:[
                        {
                            type: "Label",
                            options: {
                                label: "${label}",
                                events: {
                                    click: function(params) {
                                        _editLabel(params.edge);
                                    }
                                }
                            }
                        }
                    ]
                }
            },

            ports: {
                start: {
                    edgeType: "default"
                },
                source: {
                    maxConnections: -1,
                    edgeType: "response"
                },
                target: {
                    maxConnections: -1,
                    isTarget: true
                }
            }
        },
        // Layout the nodes using an absolute layout
        layout: {
            type: "Absolute"
        },
        grid:{
            size:{
                w:20,
                h:20
            }
        },
        events: {
            "canvasClick": (e) => {
                toolkit.clearSelection()
                edgeEditor.stopEditing()
            }
        },
        consumeRightClick: false,
        dragOptions: {
            filter: ".jtk-draw-handle, .node-action, .node-action i"
        },
        plugins:[
            {
                type: "miniview",
                options: {
                    container: miniviewElement
                }
            },
            "drawingTools",
            {
                type:"lasso",
                options: {
                    lassoInvert:true,
                    lassoEdges:true
                }
            }
        ],
        magnetize:{
            afterDrag:true
        }
    })

    const edgeEditor = new jsPlumbToolkitConnectorEditors.EdgePathEditor(renderer)

    toolkit.bind("undoRedo:update", function(state) {
        controls.setAttribute("can-undo", state.undoCount > 0 ? "true" : "false");
        controls.setAttribute("can-redo", state.redoCount > 0 ? "true" : "false");
    })

    renderer.on(controls, "tap", "[undo]",  function() {
        toolkit.undo()
    })

    renderer.on(controls, "tap", "[redo]", function() {
        toolkit.redo()
    })

    // Load the data.
    toolkit.load({
        url: "./copyright.json",
        onload:function() {
            renderer.zoomToFit()
        }
    })

    // listener for mode change on renderer.
    renderer.bind("modeChanged", function(mode) {
        jsPlumbUtil.forEach(controls.querySelectorAll("[mode]"), function(e) {
            renderer.removeClass(e, "selected-mode")
        })

        renderer.addClass(controls.querySelector("[mode='" + mode + "']"), "selected-mode")
    })

    // pan mode/select mode
    renderer.on(controls, "tap", "[mode]", function(e, eventTarget) {
        renderer.setMode(eventTarget.getAttribute("mode"))
    });

    // on home button click, zoom content to fit.
    renderer.on(controls, "tap", "[reset]",  function(e, eventTarget) {
        toolkit.clearSelection()
        renderer.zoomToFit()
    })

    // on clear button, perhaps clear the Toolkit
    renderer.on(controls, "tap", "[clear]", function(e, eventTarget) {
        if (toolkit.getNodeCount() === 0 || confirm("Clear flowchart?")) {
            toolkit.clear()
        }
    })

    //
    // node delete button.
    //
    renderer.bindModelEvent("tap", ".node-delete",  function(event, eventTarget, info) {
        dialogs.show({
            id: "dlgConfirm",
            data: {
                msg: "Delete '" + info.obj.data.text + "'"
            },
            onOK: function () {
                toolkit.removeNode(info.obj)
            }
        })
    })

    //
    // change a question or action's label
    //
    // bindModelEvent is a new method in 4.x that attaches a delegated event listener to the container element, and when a matching event
    // occurs, it passes back the event, the event target, and the associated model object. Events occur on DOM elements that are children of the element
    // representing a model object, and this method abstracts out the decoding of the appropriate model object for you.
    //
    renderer.bindModelEvent("tap", ".node-edit", function(event, eventTarget, info) {
        dialogs.show({
            id: "dlgText",
            data: info.obj.data,
            title: "Edit " + info.obj.data.type + " name",
            onOK: function(data) {
                if (data.text && data.text.length > 2) {
                    // if name is at least 2 chars long, update the underlying data and
                    // update the UI.
                    toolkit.updateNode(info.obj, data)
                }
            }
        })
    })

// ------------------------ / rendering ------------------------------------


// ------------------------ drag and drop new nodes -----------------

    //
    // Here, we are registering elements that we will want to drop onto the workspace and have
    // the toolkit recognise them as new nodes. From 1.14.7 onwards we're using the SurfaceDropManager for this,
    // which offers the simplest way to configure node/group drop, including dropping onto an edge.
    // For more information, search for SurfaceDropManager in the docs.
    //
    //  source: the element containing draggable nodes
    //  selector: css3 selector identifying elements inside `source` that ae draggable
    //  dataGenerator: this function takes a DOM element and returns some default data for a node of the type represented by the element.

    jsPlumbToolkitDrop.createSurfaceManager({
        source:nodePalette,
        selector:"div",
        dataGenerator: function (el) {
            return {
                w: parseInt(el.getAttribute('data-width'), 10),
                h: parseInt(el.getAttribute('data-height'), 10),
                type: el.getAttribute("data-node-type")
            }
        },
        surface:renderer
    })

// ------------------------ / drag and drop new nodes -----------------

// -------------------- printing --------------------------

    // register a handler in the client side. the server will look for the handler with this ID.
    jsPlumbToolkitPrint.registerHandler(renderer, "jsplumb-demo-print");

})

