import utils from '../utils';
import CONST from '../const';
import EventEmitter from 'eventemitter3';
import determineCrossOrigin from '../utils/determineCrossOrigin';
import bitTwiddle from 'bit-twiddle';

/**
 * A texture stores the information that represents an image. All textures have a base texture.
 *
 * @class
 * @extends EventEmitter
 * @memberof PIXI
 * @param [source ]{HTMLImageElement|HTMLCanvasElement} the source object of the texture.
 * @param [scaleMode=PIXI.SCALE_MODES.DEFAULT] {number} See {@link PIXI.SCALE_MODES} for possible values
 * @param [resolution=1] {number} The resolution / device pixel ratio of the texture
 */
class BaseTexture extends EventEmitter
{
    constructor(source, scaleMode, resolution)
    {
        super();

        this.uid = utils.uid();

        this.touched = 0;

        /**
         * The resolution / device pixel ratio of the texture
         *
         * @member {number}
         * @default 1
         */
        this.resolution = resolution || CONST.RESOLUTION;

        /**
         * The width of the base texture set when the image has loaded
         *
         * @member {number}
         * @readonly
         */
        this.width = 100;

        /**
         * The height of the base texture set when the image has loaded
         *
         * @member {number}
         * @readonly
         */
        this.height = 100;

        // TODO docs
        // used to store the actual dimensions of the source
        /**
         * Used to store the actual width of the source of this texture
         *
         * @member {number}
         * @readonly
         */
        this.realWidth = 100;
        /**
         * Used to store the actual height of the source of this texture
         *
         * @member {number}
         * @readonly
         */
        this.realHeight = 100;

        /**
         * The scale mode to apply when scaling this texture
         *
         * @member {number}
         * @default PIXI.SCALE_MODES.DEFAULT
         * @see PIXI.SCALE_MODES
         */
        this.scaleMode = scaleMode || CONST.SCALE_MODES.DEFAULT;

        /**
         * Set to true once the base texture has successfully loaded.
         *
         * This is never true if the underlying source fails to load or has no texture data.
         *
         * @member {boolean}
         * @readonly
         */
        this.hasLoaded = false;

        /**
         * Set to true if the source is currently loading.
         *
         * If an Image source is loading the 'loaded' or 'error' event will be
         * dispatched when the operation ends. An underyling source that is
         * immediately-available bypasses loading entirely.
         *
         * @member {boolean}
         * @readonly
         */
        this.isLoading = false;

        /**
         * The image source that is used to create the texture.
         *
         * TODO: Make this a setter that calls loadSource();
         *
         * @member {HTMLImageElement|HTMLCanvasElement}
         * @readonly
         */
        this.source = null; // set in loadSource, if at all

        /**
         * The image source that is used to create the texture. This is used to
         * store the original Svg source when it is replaced with a canvas element.
         *
         * TODO: Currently not in use but could be used when re-scaling svg.
         *
         * @member {Image}
         * @readonly
         */
        this.origSource = null; // set in loadSvg, if at all

        /**
         * Type of image defined in source, eg. `png` or `svg`
         *
         * @member {string}
         * @readonly
         */
        this.imageType = null; // set in updateImageType

        /**
         * Scale for source image. Used with Svg images to scale them before rasterization.
         *
         * @member {number}
         * @readonly
         */
        this.sourceScale = 1.0;

        /**
         * Controls if RGB channels should be pre-multiplied by Alpha  (WebGL only)
         * All blend modes, and shaders written for default value. Change it on your own risk.
         *
         * @member {boolean}
         * @default true
         */
        this.premultipliedAlpha = true;

        /**
         * The image url of the texture
         *
         * @member {string}
         */
        this.imageUrl = null;

        /**
         * Wether or not the texture is a power of two, try to use power of two textures as much as you can
         * @member {boolean}
         * @private
         */
        this.isPowerOfTwo = false;

        // used for webGL

        /**
         *
         * Set this to true if a mipmap of this texture needs to be generated. This value needs to be set before the texture is used
         * Also the texture must be a power of two size to work
         *
         * @member {boolean}
         * @see PIXI.MIPMAP_TEXTURES
         */
        this.mipmap = CONST.MIPMAP_TEXTURES;

        /**
         *
         * WebGL Texture wrap mode
         *
         * @member {number}
         * @see PIXI.WRAP_MODES
         */
        this.wrapMode = CONST.WRAP_MODES.DEFAULT;

        /**
         * A map of renderer IDs to webgl textures
         *
         * @member {object<number, WebGLTexture>}
         * @private
         */
        this._glTextures = [];
        this._enabled = 0;
        this._id = 0;

        // if no source passed don't try to load
        if (source)
        {
            this.loadSource(source);
        }

        /**
         * Fired when a not-immediately-available source finishes loading.
         *
         * @event loaded
         * @memberof PIXI.BaseTexture#
         * @protected
         */

        /**
         * Fired when a not-immediately-available source fails to load.
         *
         * @event error
         * @memberof PIXI.BaseTexture#
         * @protected
         */
    }

    /**
     * Updates the texture on all the webgl renderers, this also assumes the src has changed.
     *
     * @fires update
     */
    update()
    {
        // Svg size is handled during load
        if (this.imageType !== 'svg')
        {
            this.realWidth = this.source.naturalWidth || this.source.videoWidth || this.source.width;
            this.realHeight = this.source.naturalHeight || this.source.videoHeight || this.source.height;

            this.width = this.realWidth / this.resolution;
            this.height = this.realHeight / this.resolution;

            this.isPowerOfTwo = bitTwiddle.isPow2(this.realWidth) && bitTwiddle.isPow2(this.realHeight);
        }

        this.emit('update', this);
    }

    /**
     * Load a source.
     *
     * If the source is not-immediately-available, such as an image that needs to be
     * downloaded, then the 'loaded' or 'error' event will be dispatched in the future
     * and `hasLoaded` will remain false after this call.
     *
     * The logic state after calling `loadSource` directly or indirectly (eg. `fromImage`, `new BaseTexture`) is:
     *
     *     if (texture.hasLoaded) {
     *        // texture ready for use
     *     } else if (texture.isLoading) {
     *        // listen to 'loaded' and/or 'error' events on texture
     *     } else {
     *        // not loading, not going to load UNLESS the source is reloaded
     *        // (it may still make sense to listen to the events)
     *     }
     *
     * @protected
     * @param source {HTMLImageElement|HTMLCanvasElement} the source object of the texture.
     */
    loadSource(source)
    {
        const wasLoading = this.isLoading;
        this.hasLoaded = false;
        this.isLoading = false;

        if (wasLoading && this.source)
        {
            this.source.onload = null;
            this.source.onerror = null;
        }
		
		const firstSourceLoaded = !this.source;

        this.source = source;

        // Apply source if loaded. Otherwise setup appropriate loading monitors.
        if ((source.src && source.complete || source.getContext) && source.width && source.height)
        {
            this._updateImageType();

            if (this.imageType === 'svg')
            {
                this._loadSvgSource();
            }
            else
            {
                this._sourceLoaded();
            }
			if (firstSourceLoaded)
			{
				// send loaded event if previous source was null and we have been passed a pre-loaded IMG element
				this.emit('loaded', this);
			}
        }
        else if (!source.getContext)
        {

            // Image fail / not ready
            this.isLoading = true;

            const scope = this;

            source.onload = function ()
            {
                scope._updateImageType();
                source.onload = null;
                source.onerror = null;

                if (!scope.isLoading)
                {
                    return;
                }

                scope.isLoading = false;
                scope._sourceLoaded();

                if (scope.imageType === 'svg')
                {
                    scope._loadSvgSource();
                    return;
                }

                scope.emit('loaded', scope);
            };

            source.onerror = function ()
            {
                source.onload = null;
                source.onerror = null;

                if (!scope.isLoading)
                {
                    return;
                }

                scope.isLoading = false;
                scope.emit('error', scope);
            };

            // Per http://www.w3.org/TR/html5/embedded-content-0.html#the-img-element
            //   "The value of `complete` can thus change while a script is executing."
            // So complete needs to be re-checked after the callbacks have been added..
            // NOTE: complete will be true if the image has no src so best to check if the src is set.
            if (source.complete && source.src)
            {

                // ..and if we're complete now, no need for callbacks
                source.onload = null;
                source.onerror = null;

                if (scope.imageType === 'svg')
                {
                    scope._loadSvgSource();
                    return;
                }

                this.isLoading = false;

                if (source.width && source.height)
                {
                    this._sourceLoaded();

                    // If any previous subscribers possible
                    if (wasLoading)
                    {
                        this.emit('loaded', this);
                    }
                }
                else
                {
                    // If any previous subscribers possible
                    if (wasLoading)
                    {
                        this.emit('error', this);
                    }
                }
            }
        }
    }

    /**
     * Updates type of the source image.
     */
    _updateImageType()
    {
        if (!this.imageUrl)
        {
            return;
        }

        const dataUri = utils.decomposeDataUri(this.imageUrl);
        let imageType;

        if (dataUri && dataUri.mediaType === 'image')
        {
            // Check for subType validity
            const firstSubType = dataUri.subType.split('+')[0];
            imageType = utils.getImageTypeOfUrl('.' + firstSubType);

            if (!imageType)
            {
                throw new Error('Invalid image type in data URI.');
            }
        }
        else
        {
            imageType = utils.getImageTypeOfUrl(this.imageUrl);

            if (!imageType)
            {
                throw new Error('Invalid image type in URL.');
            }
        }

        this.imageType = imageType;
    }

    /**
     * Checks if `source` is an SVG image and whether it's loaded via a URL or a data URI. Then calls
     * `_loadSvgSourceUsingDataUri` or `_loadSvgSourceUsingXhr`.
     */
    _loadSvgSource()
    {
        if (this.imageType !== 'svg')
        {
            // Do nothing if source is not svg
            return;
        }

        const dataUri = utils.decomposeDataUri(this.imageUrl);

        if (dataUri)
        {
            this._loadSvgSourceUsingDataUri(dataUri);
        }
        else
        {
            // We got an URL, so we need to do an XHR to check the svg size
            this._loadSvgSourceUsingXhr();
        }
    }

    /**
     * Reads an SVG string from data URI and then calls `_loadSvgSourceUsingString`.
     */
    _loadSvgSourceUsingDataUri(dataUri)
    {
        let svgString;

        if (dataUri.encoding === 'base64')
        {
            if (!atob)
            {
                throw new Error('Your browser doesn\'t support base64 conversions.');
            }
            svgString = atob(dataUri.data);
        }
        else
        {
            svgString = dataUri.data;
        }

        this._loadSvgSourceUsingString(svgString);
    }

    /**
     * Loads an SVG string from `imageUrl` using XHR and then calls `_loadSvgSourceUsingString`.
     */
    _loadSvgSourceUsingXhr()
    {
        const svgXhr = new XMLHttpRequest();

        // This throws error on IE, so SVG Document can't be used
        // svgXhr.responseType = 'document';

        // This is not needed since we load the svg as string (breaks IE too)
        // but overrideMimeType() can be used to force the response to be parsed as XML
        // svgXhr.overrideMimeType('image/svg+xml');

        const scope = this;

        svgXhr.onload = function ()
        {
            if (svgXhr.readyState !== svgXhr.DONE || svgXhr.status !== 200)
            {
                throw new Error('Failed to load SVG using XHR.');
            }

            scope._loadSvgSourceUsingString(svgXhr.response);
        };

        svgXhr.onerror = function ()
        {
            scope.emit('error', scope);
        };

        svgXhr.open('GET', this.imageUrl, true);
        svgXhr.send();
    }

    /**
     * Loads texture using an SVG string. The original SVG Image is stored as `origSource` and the
     * created canvas is the new `source`. The SVG is scaled using `sourceScale`. Called by
     * `_loadSvgSourceUsingXhr` or `_loadSvgSourceUsingDataUri`.
     *
     * @param  {string} svgString SVG source as string
     *
     * @fires loaded
     */
    _loadSvgSourceUsingString(svgString)
    {
        const svgSize = utils.getSvgSize(svgString);

        const svgWidth = svgSize.width;
        const svgHeight = svgSize.height;

        if (!svgWidth || !svgHeight)
        {
            throw new Error('The SVG image must have width and height defined (in pixels), canvas API needs them.');
        }

        // Scale realWidth and realHeight
        this.realWidth = Math.round(svgWidth * this.sourceScale);
        this.realHeight = Math.round(svgHeight * this.sourceScale);

        this.width = this.realWidth / this.resolution;
        this.height = this.realHeight / this.resolution;

        // Check pow2 after scale
        this.isPowerOfTwo = bitTwiddle.isPow2(this.realWidth) && bitTwiddle.isPow2(this.realHeight);

        // Create a canvas element
        const canvas = document.createElement('canvas');
        canvas.width = this.realWidth;
        canvas.height = this.realHeight;
        canvas._pixiId = 'canvas_' + utils.uid();

        // Draw the Svg to the canvas
        canvas
            .getContext('2d')
            .drawImage(this.source, 0, 0, svgWidth, svgHeight, 0, 0, this.realWidth, this.realHeight);

        // Replace the original source image with the canvas
        this.origSource = this.source;
        this.source = canvas;

        // Add also the canvas in cache (destroy clears by `imageUrl` and `source._pixiId`)
        utils.BaseTextureCache[canvas._pixiId] = this;

        this.isLoading = false;
        this._sourceLoaded();
        this.emit('loaded', this);
    }

    /**
     * Used internally to update the width, height, and some other tracking vars once
     * a source has successfully loaded.
     *
     * @private
     */
    _sourceLoaded()
    {
        this.hasLoaded = true;
        this.update();
    }

    /**
     * Destroys this base texture
     *
     */
    destroy()
    {
        if (this.imageUrl)
        {
            delete utils.BaseTextureCache[this.imageUrl];
            delete utils.TextureCache[this.imageUrl];

            this.imageUrl = null;

            if (!navigator.isCocoonJS)
            {
                this.source.src = '';
            }
        }
        // An svg source has both `imageUrl` and `__pixiId`, so no `else if` here
        if (this.source && this.source._pixiId)
        {
            delete utils.BaseTextureCache[this.source._pixiId];
        }

        this.source = null;

        this.dispose();
    }

    /**
     * Frees the texture from WebGL memory without destroying this texture object.
     * This means you can still use the texture later which will upload it to GPU
     * memory again.
     *
     */
    dispose()
    {
        this.emit('dispose', this);

        // this should no longer be needed, the renderers should cleanup all the gl textures.
        // this._glTextures = {};
    }

    /**
     * Changes the source image of the texture.
     * The original source must be an Image element.
     *
     * @param newSrc {string} the path of the image
     */
    updateSourceImage(newSrc)
    {
        this.source.src = newSrc;

        this.loadSource(this.source);
    }

    /**
     * Helper function that creates a base texture from the given image url.
     * If the image is not in the base texture cache it will be created and loaded.
     *
     * @static
     * @param imageUrl {string} The image url of the texture
     * @param [crossorigin=(auto)] {boolean} Should use anonymous CORS? Defaults to true if the URL is not a data-URI.
     * @param [scaleMode=PIXI.SCALE_MODES.DEFAULT] {number} See {@link PIXI.SCALE_MODES} for possible values
     * @param [sourceScale=(auto)] {number} Scale for the original image, used with Svg images.
     * @return PIXI.BaseTexture
     */
    static fromImage(imageUrl, crossorigin, scaleMode, sourceScale)
    {
        let baseTexture = utils.BaseTextureCache[imageUrl];

        if (!baseTexture)
        {
            // new Image() breaks tex loading in some versions of Chrome.
            // See https://code.google.com/p/chromium/issues/detail?id=238071
            const image = new Image();//document.createElement('img');


            if (crossorigin === undefined && imageUrl.indexOf('data:') !== 0)
            {
                image.crossOrigin = determineCrossOrigin(imageUrl);
            }

            baseTexture = new BaseTexture(image, scaleMode);
            baseTexture.imageUrl = imageUrl;

            if (sourceScale)
            {
                baseTexture.sourceScale = sourceScale;
            }

            // if there is an @2x at the end of the url we are going to assume its a highres image
            baseTexture.resolution = utils.getResolutionOfUrl(imageUrl);

            image.src = imageUrl; // Setting this triggers load

            utils.BaseTextureCache[imageUrl] = baseTexture;
        }

        return baseTexture;
    }

    /**
     * Helper function that creates a base texture from the given canvas element.
     *
     * @static
     * @param canvas {HTMLCanvasElement} The canvas element source of the texture
     * @param scaleMode {number} See {@link PIXI.SCALE_MODES} for possible values
     * @return PIXI.BaseTexture
     */
    static fromCanvas(canvas, scaleMode)
    {
        if (!canvas._pixiId)
        {
            canvas._pixiId = 'canvas_' + utils.uid();
        }

        let baseTexture = utils.BaseTextureCache[canvas._pixiId];

        if (!baseTexture)
        {
            baseTexture = new BaseTexture(canvas, scaleMode);
            utils.BaseTextureCache[canvas._pixiId] = baseTexture;
        }

        return baseTexture;
    }
}

export default BaseTexture;
