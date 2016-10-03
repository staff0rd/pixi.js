import WebGLManager from './WebGLManager';
import AlphaMaskFilter from '../filters/spriteMask/SpriteMaskFilter';

/**
 * @class
 * @memberof PIXI
 * @param renderer {PIXI.WebGLRenderer} The renderer this manager works for.
 */
class MaskManager extends WebGLManager
{
    constructor(renderer)
    {
        super(renderer);

        //TODO - we don't need both!
        this.scissor = false;
        this.scissorData = null;
        this.scissorRenderTarget = null;

        this.enableScissor = true;

        this.alphaMaskPool = [];
        this.alphaMaskIndex = 0;
    }

    /**
     * Applies the Mask and adds it to the current filter stack.
     *
     * @param target {PIXI.DisplayObject} Display Object to push the mask to
     * @param maskData {PIXI.Sprite|PIXI.Graphics}
     */
    pushMask(target, maskData)
    {
        if (maskData.texture)
        {
            this.pushSpriteMask(target, maskData);
        }
        else
        {
            if(this.enableScissor && !this.scissor && !this.renderer.stencilManager.stencilMaskStack.length && maskData.isFastRect())
            {
                const matrix = maskData.worldTransform;

                let rot = Math.atan2(matrix.b, matrix.a);

                // use the nearest degree!
                rot = Math.round(rot * (180/Math.PI));

                if(rot % 90)
                {
                    this.pushStencilMask(maskData);
                }
                else
                {
                    this.pushScissorMask(target, maskData);
                }
            }
            else
            {
                this.pushStencilMask(maskData);
            }
        }
    }

    /**
     * Removes the last mask from the mask stack and doesn't return it.
     *
     * @param target {PIXI.DisplayObject} Display Object to pop the mask from
     * @param maskData {Array<*>}
     */
    popMask(target, maskData)
    {
        if (maskData.texture)
        {
            this.popSpriteMask(target, maskData);
        }
        else
        {
            if(this.enableScissor && !this.renderer.stencilManager.stencilMaskStack.length)
            {
                this.popScissorMask(target, maskData);
            }
            else
            {
                this.popStencilMask(target, maskData);
            }

        }
    }

    /**
     * Applies the Mask and adds it to the current filter stack.
     *
     * @param target {PIXI.RenderTarget} Display Object to push the sprite mask to
     * @param maskData {PIXI.Sprite} Sprite to be used as the mask
     */
    pushSpriteMask(target, maskData)
    {
        let alphaMaskFilter = this.alphaMaskPool[this.alphaMaskIndex];

        if (!alphaMaskFilter)
        {
            alphaMaskFilter = this.alphaMaskPool[this.alphaMaskIndex] = [new AlphaMaskFilter(maskData)];
        }

        alphaMaskFilter[0].resolution = this.renderer.resolution;
        alphaMaskFilter[0].maskSprite = maskData;

        //TODO - may cause issues!
        target.filterArea = maskData.getBounds(true);

        this.renderer.filterManager.pushFilter(target, alphaMaskFilter);

        this.alphaMaskIndex++;
    }

    /**
     * Removes the last filter from the filter stack and doesn't return it.
     *
     */
    popSpriteMask()
    {
        this.renderer.filterManager.popFilter();
        this.alphaMaskIndex--;
    }


    /**
     * Applies the Mask and adds it to the current filter stack.
     *
     * @param maskData {Array<*>}
     */
    pushStencilMask(maskData)
    {
        this.renderer.currentRenderer.stop();
        this.renderer.stencilManager.pushStencil(maskData);
    }

    /**
     * Removes the last filter from the filter stack and doesn't return it.
     *
     */
    popStencilMask()
    {
        this.renderer.currentRenderer.stop();
        this.renderer.stencilManager.popStencil();
    }

    /**
     *
     * @param target {PIXI.RenderTarget} Display Object to push the scissor mask to
     * @param maskData
     */
    pushScissorMask(target, maskData)
    {
        maskData.renderable = true;

        const renderTarget = this.renderer._activeRenderTarget;

        const bounds = maskData.getBounds();

        bounds.fit(renderTarget.size);
        maskData.renderable = false;

        this.renderer.gl.enable(this.renderer.gl.SCISSOR_TEST);

        const resolution = this.renderer.resolution;
        this.renderer.gl.scissor(bounds.x * resolution,
            (renderTarget.root ? renderTarget.size.height - bounds.y - bounds.height : bounds.y) * resolution,
                               bounds.width * resolution,
                               bounds.height * resolution);

        this.scissorRenderTarget = renderTarget;
        this.scissorData = maskData;
        this.scissor = true;
    }

    /**
     *
     *
     */
    popScissorMask()
    {
        this.scissorRenderTarget = null;
        this.scissorData = null;
        this.scissor = false;

        // must be scissor!
        const gl = this.renderer.gl;
        gl.disable(gl.SCISSOR_TEST);
    }
}

export default MaskManager;
