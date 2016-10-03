import mapWebGLBlendModesToPixi from './utils/mapWebGLBlendModesToPixi';

const BLEND = 0,
    DEPTH_TEST = 1,
    FRONT_FACE = 2,
    CULL_FACE = 3,
    BLEND_FUNC = 4;

/**
 * A WebGL state machines
 *
 * @memberof PIXI
 * @class
 * @param gl {WebGLRenderingContext} The current WebGL rendering context
 */
class WebGLState
{
    constructor(gl)
    {
        /**
         * The current active state
         *
         * @member {Uint8Array}
         */
        this.activeState = new Uint8Array(16);

        /**
         * The default state
         *
         * @member {Uint8Array}
         */
        this.defaultState = new Uint8Array(16);

        // default blend mode..
        this.defaultState[0] = 1;

        /**
         * The current state index in the stack
         *
         * @member {number}
         * @private
         */
        this.stackIndex = 0;

        /**
         * The stack holding all the different states
         *
         * @member {Array<*>}
         * @private
         */
        this.stack = [];

        /**
         * The current WebGL rendering context
         *
         * @member {WebGLRenderingContext}
         */
        this.gl = gl;

        this.maxAttribs = gl.getParameter(gl.MAX_VERTEX_ATTRIBS);

        this.attribState = {
            tempAttribState: new Array(this.maxAttribs),
            attribState: new Array(this.maxAttribs)
        };

        this.blendModes = mapWebGLBlendModesToPixi(gl);

        // check we have vao..
        this.nativeVaoExtension = (
            gl.getExtension('OES_vertex_array_object') ||
            gl.getExtension('MOZ_OES_vertex_array_object') ||
            gl.getExtension('WEBKIT_OES_vertex_array_object')
        );
    }

    /**
     * Pushes a new active state
     */
    push()
    {
        // next state..
        let state = this.stack[++this.stackIndex];

        if (!state)
        {
            state = this.stack[this.stackIndex] = new Uint8Array(16);
        }

        // copy state..
        // set active state so we can force overrides of gl state
        for (let i = 0; i < this.activeState.length; i++)
        {
            this.activeState[i] = state[i];
        }
    }

    /**
     * Pops a state out
     */
    pop()
    {
        const state = this.stack[--this.stackIndex];
        this.setState(state);
    }

    /**
     * Sets the current state
     * @param state {number}
     */
    setState(state)
    {
        this.setBlend(state[BLEND]);
        this.setDepthTest(state[DEPTH_TEST]);
        this.setFrontFace(state[FRONT_FACE]);
        this.setCullFace(state[CULL_FACE]);
        this.setBlendMode(state[BLEND_FUNC]);
    }

    /**
     * Sets the blend mode ? @mat
     * @param value {number}
     */
    setBlend(value)
    {
        if (this.activeState[BLEND] === value | 0)
        {
            return;
        }
        this.activeState[BLEND] = value | 0;
        this.gl[value ? 'enable' : 'disable'](this.gl.BLEND);
    }

    /**
     * Sets the blend mode ? @mat
     * @param value {number}
     */
    setBlendMode(value)
    {
        if (value === this.activeState[BLEND_FUNC])
        {
            return;
        }

        this.activeState[BLEND_FUNC] = value;

        this.gl.blendFunc(this.blendModes[value][0], this.blendModes[value][1]);
    }

    /**
     * Sets the depth test @mat
     * @param value {number}
     */
    setDepthTest(value)
    {
        if (this.activeState[DEPTH_TEST] === value | 0)
        {
            return;
        }

        this.activeState[DEPTH_TEST] = value | 0;
        this.gl[value ? 'enable' : 'disable'](this.gl.DEPTH_TEST);
    }

    /**
     * Sets the depth test @mat
     * @param value {number}
     */
    setCullFace(value)
    {
        if (this.activeState[CULL_FACE] === value | 0)
        {
            return;
        }

        this.activeState[CULL_FACE] = value | 0;
        this.gl[value ? 'enable' : 'disable'](this.gl.CULL_FACE);
    }

    /**
     * Sets the depth test @mat
     * @param value {number}
     */
    setFrontFace(value)
    {
        if (this.activeState[FRONT_FACE] === value | 0)
        {
            return;
        }

        this.activeState[FRONT_FACE] = value | 0;
        this.gl.frontFace(this.gl[value ? 'CW' : 'CCW']);
    }

    /**
     * Disables all the vaos in use
     */
    resetAttributes()
    {

        for (let i = 0; i < this.attribState.tempAttribState.length; i++)
        {
            this.attribState.tempAttribState[i] = 0;
        }

        for (let i = 0; i < this.attribState.attribState.length; i++)
        {
            this.attribState.attribState[i] = 0;
        }

        // im going to assume one is always active for performance reasons.
        for (let i = 1; i < this.maxAttribs; i++)
        {
            this.gl.disableVertexAttribArray(i);
        }
    }

    //used
    /**
     * Resets all the logic and disables the vaos
     */
    resetToDefault()
    {

        // unbind any VAO if they exist..
        if (this.nativeVaoExtension)
        {
            this.nativeVaoExtension.bindVertexArrayOES(null);
        }


        // reset all attributs..
        this.resetAttributes();

        // set active state so we can force overrides of gl state
        for (let i = 0; i < this.activeState.length; i++)
        {
            this.activeState[i] = 32;
        }

        const gl = this.gl;
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);


        this.setState(this.defaultState);
    }
}

export default WebGLState;
