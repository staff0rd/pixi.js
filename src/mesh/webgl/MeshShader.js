import Shader from '../../core/Shader';

/**
 * @class
 * @extends PIXI.Shader
 * @memberof PIXI.mesh
 * @param gl {PIXI.Shader} TODO: Find a good explanation for this.
 */
class MeshShader extends Shader
{
    constructor(gl)
    {
        super(
            gl,
            // vertex shader
            [
                'attribute vec2 aVertexPosition;',
                'attribute vec2 aTextureCoord;',

                'uniform mat3 translationMatrix;',
                'uniform mat3 projectionMatrix;',

                'varying vec2 vTextureCoord;',

                'void main(void){',
                '   gl_Position = vec4((projectionMatrix * translationMatrix * vec3(aVertexPosition, 1.0)).xy, 0.0, 1.0);',
                '   vTextureCoord = aTextureCoord;',
                '}'
            ].join('\n'),
            [
                'varying vec2 vTextureCoord;',
                'uniform float alpha;',
                'uniform vec3 tint;',

                'uniform sampler2D uSampler;',

                'void main(void){',
                '   gl_FragColor = texture2D(uSampler, vTextureCoord) * vec4(tint * alpha, alpha);',
               // '   gl_FragColor = vec4(1.0);',
                '}'
            ].join('\n')
        );
    }
}

export default MeshShader;