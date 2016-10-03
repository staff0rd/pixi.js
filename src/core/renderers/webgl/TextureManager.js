import {GLTexture} from 'pixi-gl-core';
import CONST from '../../const';
import RenderTarget from './utils/RenderTarget';
import utils from '../../utils';

/**
 * Helper class to create a webGL Texture
 *
 * @class
 * @memberof PIXI
 * @param renderer {PIXI.WebGLRenderer} A reference to the current renderer
 */
class TextureManager
{
    constructor(renderer)
    {
        /**
         * A reference to the current renderer
         *
         * @member {PIXI.WebGLRenderer}
         */
        this.renderer = renderer;

        /**
         * The current WebGL rendering context
         *
         * @member {WebGLRenderingContext}
         */
        this.gl = renderer.gl;

        /**
         * Track textures in the renderer so we can no longer listen to them on destruction.
         *
         * @member {Array<*>}
         * @private
         */
        this._managedTextures = [];
    }

    bindTexture()
    {
    }


    getTexture()
    {
    }

    /**
     * Updates and/or Creates a WebGL texture for the renderer's context.
     *
     * @param texture {PIXI.BaseTexture|PIXI.Texture} the texture to update
     */
    updateTexture(texture)
    {
        texture = texture.baseTexture || texture;

        const isRenderTexture = !!texture._glRenderTargets;

        if (!texture.hasLoaded)
        {
            return;
        }

        let glTexture = texture._glTextures[this.renderer.CONTEXT_UID];

        if (!glTexture)
        {
            if(isRenderTexture)
            {
                const renderTarget = new RenderTarget(this.gl, texture.width, texture.height, texture.scaleMode, texture.resolution);
                renderTarget.resize(texture.width, texture.height);
                texture._glRenderTargets[this.renderer.CONTEXT_UID] = renderTarget;
                glTexture = renderTarget.texture;
            }
            else
            {
                glTexture = new GLTexture(this.gl);
                glTexture.premultiplyAlpha = true;
                glTexture.upload(texture.source);
            }

            texture._glTextures[this.renderer.CONTEXT_UID] = glTexture;

            texture.on('update', this.updateTexture, this);
            texture.on('dispose', this.destroyTexture, this);

            this._managedTextures.push(texture);

            if(texture.isPowerOfTwo)
            {
                if(texture.mipmap)
                {
                    glTexture.enableMipmap();
                }

                if(texture.wrapMode === CONST.WRAP_MODES.CLAMP)
                {
                    glTexture.enableWrapClamp();
                }
                else if(texture.wrapMode === CONST.WRAP_MODES.REPEAT)
                {
                    glTexture.enableWrapRepeat();
                }
                else
                {
                    glTexture.enableWrapMirrorRepeat();
                }
            }
            else
            {
                glTexture.enableWrapClamp();
            }

            if(texture.scaleMode === CONST.SCALE_MODES.NEAREST)
            {
                glTexture.enableNearestScaling();
            }
            else
            {
                glTexture.enableLinearScaling();
            }
        }
        else
        {
            // the textur ealrady exists so we only need to update it..
            if(isRenderTexture)
            {
                texture._glRenderTargets[this.renderer.CONTEXT_UID].resize(texture.width, texture.height);
            }
            else
            {
                glTexture.upload(texture.source);
            }
        }

        return  glTexture;
    }

    /**
     * Deletes the texture from WebGL
     *
     * @param texture {PIXI.BaseTexture|PIXI.Texture} the texture to destroy
     * @param [skipRemove=false] {boolean} Whether to skip removing the texture from the TextureManager.
     */
    destroyTexture(texture, skipRemove)
    {
        texture = texture.baseTexture || texture;

        if (!texture.hasLoaded)
        {
            return;
        }

        if (texture._glTextures[this.renderer.CONTEXT_UID])
        {
            texture._glTextures[this.renderer.CONTEXT_UID].destroy();
            texture.off('update', this.updateTexture, this);
            texture.off('dispose', this.destroyTexture, this);


            delete texture._glTextures[this.renderer.CONTEXT_UID];

            if (!skipRemove)
            {
                const i = this._managedTextures.indexOf(texture);
                if (i !== -1)
                {
                    utils.removeItems(this._managedTextures, i, 1);
                }
            }
        }
    }

    /**
     * Deletes all the textures from WebGL
     */
    removeAll()
    {
        // empty all the old gl textures as they are useless now
        for (let i = 0; i < this._managedTextures.length; ++i)
        {
            const texture = this._managedTextures[i];
            if (texture._glTextures[this.renderer.CONTEXT_UID])
            {
                delete texture._glTextures[this.renderer.CONTEXT_UID];
            }
        }
    }

    /**
     * Destroys this manager and removes all its textures
     */
    destroy()
    {
        // destroy managed textures
        for (let i = 0; i < this._managedTextures.length; ++i)
        {
            const texture = this._managedTextures[i];
            this.destroyTexture(texture, true);
            texture.off('update', this.updateTexture, this);
            texture.off('dispose', this.destroyTexture, this);
        }

        this._managedTextures = null;
    }
}

export default TextureManager;
