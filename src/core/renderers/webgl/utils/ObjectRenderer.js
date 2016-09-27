import WebGLManager from '../managers/WebGLManager';

/**
 * Base for a common object renderer that can be used as a system renderer plugin.
 *
 * @class
 * @extends PIXI.WebGLManager
 * @memberof PIXI
 * @param renderer {PIXI.WebGLRenderer} The renderer this object renderer works for.
 */
class ObjectRenderer extends WebGLManager
{
    constructor(renderer)
    {
        super(renderer);
    }

    /**
     * Starts the renderer and sets the shader
     *
     */
    start()
    {
        // set the shader..
    }

    /**
     * Stops the renderer
     *
     */
    stop()
    {
        this.flush();
    }

    /**
     * Stub method for rendering content and emptying the current batch.
     *
     */
    flush()
    {
        // flush!
    }

    /**
     * Renders an object
     *
     * @param object {PIXI.DisplayObject} The object to render.
     */
    render(object) // eslint-disable-line no-unused-vars
    {
        // render the object
    }
}

export default ObjectRenderer;