import { Control3D } from "@babylonjs/gui/3D/controls/control3D";

import { Nullable } from "@babylonjs/core/types";
import { Observer } from "@babylonjs/core/Misc/observable";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { Vector4 } from "@babylonjs/core/Maths/math.vector";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { BoxBuilder } from "@babylonjs/core/Meshes/Builders/boxBuilder";
import { Scene } from "@babylonjs/core/scene";
import { Material } from "@babylonjs/core/Materials/material";
import { ISize } from "@babylonjs/core/Maths/math.size";
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { DomManagement } from "@babylonjs/core/Misc/domManagement";

import { FluentMaterial } from "@babylonjs/gui/3D/materials/fluentMaterial";
import { StackPanel } from "@babylonjs/gui/2D/controls/stackPanel";
import { Image } from "@babylonjs/gui/2D/controls/image";
import { TextBlock } from "@babylonjs/gui/2D/controls/textBlock";
import { AdvancedDynamicTexture } from "@babylonjs/gui/2D/advancedDynamicTexture";
import { Control } from "@babylonjs/gui/2D/controls/control";

/**
 * Class used to create a holographic button in 3D.
 */
export class HolographicLabel extends Control3D {
    private _backPlate!: Mesh;
    private _textPlate!: Mesh;
    private _frontPlate!: Mesh;
    private _text!: string;
    private _imageUrl!: string;
    private _shareMaterials = true;
    private _frontMaterial!: FluentMaterial;
    private _backMaterial!: FluentMaterial;
    private _plateMaterial!: StandardMaterial;
    private _pickedPointObserver!: Nullable<Observer<Nullable<Vector3>>>;

    /** @hidden */
    protected _currentMaterial!: Material;
    private _facadeTexture!: Nullable<AdvancedDynamicTexture>;
    private _content!: Control;
    private _contentResolution = 512;
    private _contentScaleRatio = 2;
    private _width = 1;
    private _height = 1;
    private _imageWidth: number | string = "100px";
    private _imageHeight: number | string = "180px";
    private _imagePaddingTop: number | string = "40px";
    private _imagePaddingBottom: number | string = "40px";
    private _isButton = false;
    // fontWeight

    protected _disposeFacadeTexture() {
        if (this._facadeTexture) {
            this._facadeTexture.dispose();
            this._facadeTexture = null;
        }
    }

    /**
     * Rendering ground id of all the mesh in the button
     */
    public set renderingGroupId(id: number) {
        this._backPlate.renderingGroupId = id;
        this._textPlate.renderingGroupId = id;
        this._frontPlate.renderingGroupId = id;
    }
    public get renderingGroupId(): number {
        return this._backPlate.renderingGroupId;
    }

    /**
     * Gets or sets the width.
     */
    public get width(): number {
        return this._width;
    }
    public set width(value: number) {
        if (this._width !== value) {
            this._width = value;
            this._rebuildContent();
        }
    }

    /**
     * Gets or sets the height.
     */
    public get height(): number {
        return this._height;
    }
    public set height(value: number) {
        if (this._height !== value) {
            this._height = value;
            this._rebuildContent();
        }
    }

    /**
     * Gets or sets the image width.
     */
    public get imageWidth(): number | string {
        return this._imageWidth;
    }
    public set imageWidth(value: number | string) {
        if (this._imageWidth !== value) {
            this._imageWidth = value;
            this._rebuildContent();
        }
    }

    /**
     * Gets or sets the image height.
     */
    public get imageHeight(): number | string {
        return this._imageHeight;
    }
    public set imageHeight(value: number | string) {
        if (this._imageHeight !== value) {
            this._imageHeight = value;
            this._rebuildContent();
        }
    }

    /**
     * Gets or sets the image padding on top.
     */
    public get imagePaddingTop(): number | string {
        return this._imagePaddingTop;
    }
    public set imagePaddingTop(value: number | string) {
        if (this._imagePaddingTop !== value) {
            this._imagePaddingTop = value;
            this._rebuildContent();
        }
    }

    /**
     * Gets or sets the image padding on top.
     */
    public get imagePaddingBottom(): number | string {
        return this._imagePaddingBottom;
    }
    public set imagePaddingBottom(value: number | string) {
        if (this._imagePaddingBottom !== value) {
            this._imagePaddingBottom = value;
            this._rebuildContent();
        }
    }

    /**
     * Gets or sets text for the button
     */
    public get text(): string {
        return this._text;
    }
    public set text(value: string) {
        if (this._text === value) {
            return;
        }
        this._text = value;
        this._rebuildContent();
    }

    /**
     * Gets or sets the image url for the button
     */
    public get imageUrl(): string {
        return this._imageUrl;
    }

    public set imageUrl(value: string) {
        if (this._imageUrl === value) {
            return;
        }

        this._imageUrl = value;
        this._rebuildContent();
    }

    public get isButton(): boolean {
        return this._isButton;
    }

    public set isButton(value: boolean) {
        if (this._isButton === value) {
            return;
        }

        this._isButton = value;
        if (this._frontMaterial) {
          this._frontMaterial.renderBorders = value;
        }
        this._rebuildContent();
    }

    /**
     * Gets the back material used by this button
     */
    public get backMaterial(): FluentMaterial {
        return this._backMaterial;
    }

    /**
     * Gets the front material used by this button
     */
    public get frontMaterial(): FluentMaterial {
        return this._frontMaterial;
    }

    /**
     * Gets the plate material used by this button
     */
    public get plateMaterial(): StandardMaterial {
        return this._plateMaterial;
    }

    /**
     * Gets a boolean indicating if this button shares its material with other HolographicButtons
     */
    public get shareMaterials(): boolean {
        return this._shareMaterials;
    }

    /**
     * Creates a new button
     * @param name defines the control name
     */
    constructor(name?: string, size: ISize = { width: 1, height: 1 }, shareMaterials = true) {
        super(name);
        this.width = size.width || 1;
        this.height = size.height || 1;

        this._shareMaterials = shareMaterials;

        this.pointerEnterAnimation = () => {
            if (!this.mesh || this.isButton) {
                return;
            }
            this._frontPlate.setEnabled(true);
        };
        this.pointerOutAnimation = () => {
            if (!this.mesh || this.isButton) {
                return;
            }
            this._frontPlate.setEnabled(false);
        };
    }

    protected _getTypeName(): string {
        return "HolographicLabel";
    }

    private _rebuildContent(): void {
        this._disposeFacadeTexture();

        let panel = new StackPanel();
        panel.isVertical = true;
        //panel.paddingBottom = "10px"

        if (DomManagement.IsDocumentAvailable() && !!document.createElement) {
            if (this._imageUrl) {
                let image = new Image();
                image.source = this._imageUrl;
                image.paddingTop = this.imagePaddingTop;
                image.height = this.imageHeight;
                image.width = this.imageWidth;
                image.paddingBottom = this.imagePaddingBottom;
                panel.addControl(image);
            }
        }

        if (this._text) {
            let text = new TextBlock();
            text.text = this._text;
            text.color = "white";
            text.height = "30px";
            text.fontSize = 24;
            //text.fontSize = 36;
            //text.fontWeight = "500px";
            text.fontStyle = "bold";
            //text.paddingBottom = "20px"
            panel.addControl(text);
        }

        if (this._frontPlate) {
            this.content = panel;
        }
    }

    protected _createPlate(scene: Scene): TransformNode {
        const faceUV = new Array(6);

        for (let i = 0; i < 6; i++) {
            faceUV[i] = new Vector4(0, 0, 0, 0);
        }
        faceUV[1] = new Vector4(0, 0, 1, 1);

        const mesh = BoxBuilder.CreateBox(this.name + "_rootMesh", {
            width: this.width,
            height: this.height,
            depth: 0.08,
            faceUV: faceUV
        }, scene);

        return mesh;
    }

    // Mesh association
    protected _createNode(scene: Scene): TransformNode {
        this._backPlate = BoxBuilder.CreateBox(this.name + "BackMesh", {
            width: this.width,
            height: this.height,
            depth: 0.08
        }, scene);

        this._frontPlate = BoxBuilder.CreateBox(this.name + "FrontMesh", {
            width: this.width,
            height: this.height,
            depth: 0.08
        }, scene);

        this._frontPlate.parent = this._backPlate;
        this._frontPlate.position.z = -0.08;
        this._frontPlate.isPickable = false;
        this._frontPlate.setEnabled(false);

        this._textPlate = <Mesh>this._createPlate(scene);
        this._textPlate.parent = this._backPlate;
        this._textPlate.position.z = -0.08;
        this._textPlate.isPickable = false;

        return this._backPlate;
    }

    protected _applyFacade(facadeTexture: AdvancedDynamicTexture) {
        this._plateMaterial.emissiveTexture = facadeTexture;
        this._plateMaterial.opacityTexture = facadeTexture;
    }

    private _createBackMaterial(mesh: Mesh) {
        this._backMaterial = new FluentMaterial(this.name + "Back Material", mesh.getScene());
        this._backMaterial.renderHoverLight = true;
        this._pickedPointObserver = this._host.onPickedPointChangedObservable.add((pickedPoint) => {
            if (pickedPoint) {
                this._backMaterial.hoverPosition = pickedPoint;
                this._backMaterial.hoverColor.a = 1.0;
            } else {
                this._backMaterial.hoverColor.a = 0;
            }
        });
    }

    private _createFrontMaterial(mesh: Mesh) {
        this._frontMaterial = new FluentMaterial(this.name + "Front Material", mesh.getScene());
        this._frontMaterial.innerGlowColorIntensity = 0; // No inner glow
        this._frontMaterial.alpha = 0.5; // Additive
        this._frontMaterial.renderBorders = this.isButton;
    }

    private _createPlateMaterial(mesh: Mesh) {
        this._plateMaterial = new StandardMaterial(this.name + "Plate Material", mesh.getScene());
        this._plateMaterial.specularColor = Color3.Black();
    }

    protected _affectMaterial(mesh: Mesh) {
        // Back
        if (this._shareMaterials) {
            if (!this._host._sharedMaterials["backFluentMaterial"]) {
                this._createBackMaterial(mesh);
                this._host._sharedMaterials["backFluentMaterial"] = this._backMaterial;
            } else {
                this._backMaterial = this._host._sharedMaterials["backFluentMaterial"] as FluentMaterial;
            }

            // Front
            if (!this._host._sharedMaterials["frontFluentMaterial"]) {
                this._createFrontMaterial(mesh);
                this._host._sharedMaterials["frontFluentMaterial"] = this._frontMaterial;
            } else {
                this._frontMaterial = this._host._sharedMaterials["frontFluentMaterial"] as FluentMaterial;
            }
        } else {
            this._createBackMaterial(mesh);
            this._createFrontMaterial(mesh);
        }

        this._createPlateMaterial(mesh);
        this._backPlate.material = this._backMaterial;
        this._frontPlate.material = this._frontMaterial;
        this._textPlate.material = this._plateMaterial;

        this._rebuildContent();
    }

    /**
     * Releases all associated resources
     */
    public dispose() {
        super.dispose(); // will dispose main mesh ie. back plate

        if (!this.shareMaterials) {
            this._backMaterial.dispose();
            this._frontMaterial.dispose();
            this._plateMaterial.dispose();

            if (this._pickedPointObserver) {
                this._host.onPickedPointChangedObservable.remove(this._pickedPointObserver);
                this._pickedPointObserver = null;
            }
        }
    }

    /**
     * Gets or sets the GUI 2D content used to display the button's facade
     */
    public get content(): Control {
        return this._content;
    }

    public set content(value: Control) {
        this._content = value;

        if (!this._host || !this._host.utilityLayer) {
            return;
        }

        if (!this._facadeTexture) {
            const width = this._contentResolution * this.width;
            const height = this._contentResolution * this.height;
            this._facadeTexture = AdvancedDynamicTexture.CreateForMesh(this._textPlate, width, height);
            this._facadeTexture.rootContainer.scaleX = this._contentScaleRatio;
            this._facadeTexture.rootContainer.scaleY = this._contentScaleRatio;
            this._facadeTexture.premulAlpha = true;
        } else {
            this._facadeTexture.rootContainer.clearControls();
        }

        this._facadeTexture.addControl(value);

        this._applyFacade(this._facadeTexture);
    }
}
