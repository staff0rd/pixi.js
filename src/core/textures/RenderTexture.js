import BaseRenderTexture from './BaseRenderTexture';
import Texture from './Texture';

/**
 * A RenderTexture is a special texture that allows any Pixi display object to be rendered to it.
 *
 * __Hint__: All DisplayObjects (i.e. Sprites) that render to a RenderTexture should be preloaded
 * otherwise black rectangles will be drawn instead.
 *
 * A RenderTexture takes a snapshot of any Display Object given to its render method. The position
 * and rotation of the given Display Objects is ignored. For example:
 *
 * ```js
 * let renderer = PIXI.autoDetectRenderer(1024, 1024, { view: canvas, ratio: 1 });
 * let renderTexture = PIXI.RenderTexture.create(800, 600);
 * let sprite = PIXI.Sprite.fromImage("spinObj_01.png");
 *
 * sprite.position.x = 800/2;
 * sprite.position.y = 600/2;
 * sprite.anchor.x = 0.5;
 * sprite.anchor.y = 0.5;
 *
 * renderer.render(sprite, renderTexture);
 * ```
 *
 * The Sprite in this case will be rendered to a position of 0,0. To render this sprite at its actual
 * position a Container should be used:
 *
 * ```js
 * let doc = new PIXI.Container();
 *
 * doc.addChild(sprite);
 *
 * renderer.render(doc, renderTexture);  // Renders to center of renderTexture
 * ```
 *
 * @class
 * @extends PIXI.Texture
 * @memberof PIXI
 * @param baseRenderTexture {PIXI.BaseRenderTexture} The renderer used for this RenderTexture
 * @param [frame] {PIXI.Rectangle} The rectangle frame of the texture to show
 */
class RenderTexture extends Texture
{
    constructor(baseRenderTexture, frame)
    {
        // suport for legacy..
        let _legacyRenderer = null;

        if( !(baseRenderTexture instanceof BaseRenderTexture) )
        {
            const width = arguments[1];
            const height = arguments[2];
            const scaleMode = arguments[3] || 0;
            const resolution = arguments[4] || 1;

            // we have an old render texture..
            console.warn(`v4 RenderTexture now expects a new BaseRenderTexture. Please use RenderTexture.create(${width}, ${height})`);
            _legacyRenderer = arguments[0];

            frame = null;
            baseRenderTexture = new BaseRenderTexture(width, height, scaleMode, resolution);
        }


        /**
         * The base texture object that this texture uses
         *
         * @member {BaseTexture}
         */
        super(
            baseRenderTexture,
            frame
        );

        this.legacyRenderer = _legacyRenderer;

        /**
         * This will let the renderer know if the texture is valid. If it's not then it cannot be rendered.
         *
         * @member {boolean}
         */
        this.valid = true;

        this._updateUvs();
    }

    /**
     * Resizes the RenderTexture.
     *
     * @param width {number} The width to resize to.
     * @param height {number} The height to resize to.
     * @param doNotResizeBaseTexture {boolean} Should the baseTexture.width and height values be resized as well?
     */
    resize(width, height, doNotResizeBaseTexture)
    {

        //TODO - could be not required..
        this.valid = (width > 0 && height > 0);

        this._frame.width = this.orig.width = width;
        this._frame.height = this.orig.height = height;

        if (!doNotResizeBaseTexture)
        {
            this.baseTexture.resize(width, height);
        }

        this._updateUvs();
    }

    /**
     * A short hand way of creating a render texture..
     * @param [width=100] {number} The width of the render texture
     * @param [height=100] {number} The height of the render texture
     * @param [scaleMode=PIXI.SCALE_MODES.DEFAULT] {number} See {@link PIXI.SCALE_MODES} for possible values
     * @param [resolution=1] {number} The resolution / device pixel ratio of the texture being generated
     */
    static create(width, height, scaleMode, resolution)
    {
        return new RenderTexture(new BaseRenderTexture(width, height, scaleMode, resolution));
    }
}

export default RenderTexture;
