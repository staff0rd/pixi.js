import earcut from 'earcut';
import buildLine from './buildLine';
import utils from '../../../utils';

/**
 * Builds a rounded rectangle to draw
 *
 * Ignored from docs since it is not directly exposed.
 *
 * @ignore
 * @private
 * @param graphicsData {PIXI.WebGLGraphicsData} The graphics object containing all the necessary properties
 * @param webGLData {object} an object containing all the webGL-specific information to create this shape
 */
const buildRoundedRectangle = function (graphicsData, webGLData)
{
    const rrectData = graphicsData.shape;
    const x = rrectData.x;
    const y = rrectData.y;
    const width = rrectData.width;
    const height = rrectData.height;

    const radius = rrectData.radius;

    const recPoints = [];
    recPoints.push(x, y + radius);
    quadraticBezierCurve(x, y + height - radius, x, y + height, x + radius, y + height, recPoints);
    quadraticBezierCurve(x + width - radius, y + height, x + width, y + height, x + width, y + height - radius, recPoints);
    quadraticBezierCurve(x + width, y + radius, x + width, y, x + width - radius, y, recPoints);
    quadraticBezierCurve(x + radius, y, x, y, x, y + radius + 0.0000000001, recPoints);

    // this tiny number deals with the issue that occurs when points overlap and earcut fails to triangulate the item.
    // TODO - fix this properly, this is not very elegant.. but it works for now.

    if (graphicsData.fill)
    {
        const color = utils.hex2rgb(graphicsData.fillColor);
        const alpha = graphicsData.fillAlpha;

        const r = color[0] * alpha;
        const g = color[1] * alpha;
        const b = color[2] * alpha;

        const verts = webGLData.points;
        const indices = webGLData.indices;

        const vecPos = verts.length/6;

        const triangles = earcut(recPoints, null, 2);

        for (let i = 0, j=triangles.length; i < j; i+=3)
        {
            indices.push(triangles[i] + vecPos);
            indices.push(triangles[i] + vecPos);
            indices.push(triangles[i+1] + vecPos);
            indices.push(triangles[i+2] + vecPos);
            indices.push(triangles[i+2] + vecPos);
        }

        for (let i = 0, j = recPoints.length; i < j; i++)
        {
            verts.push(recPoints[i], recPoints[++i], r, g, b, alpha);
        }
    }

    if (graphicsData.lineWidth)
    {
        const tempPoints = graphicsData.points;

        graphicsData.points = recPoints;

        buildLine(graphicsData, webGLData);

        graphicsData.points = tempPoints;
    }
};

/**
 * Calculate the points for a quadratic bezier curve. (helper function..)
 * Based on: https://stackoverflow.com/questions/785097/how-do-i-implement-a-bezier-curve-in-c
 *
 * Ignored from docs since it is not directly exposed.
 *
 * @ignore
 * @private
 * @param fromX {number} Origin point x
 * @param fromY {number} Origin point x
 * @param cpX {number} Control point x
 * @param cpY {number} Control point y
 * @param toX {number} Destination point x
 * @param toY {number} Destination point y
 * @param [out=[]] {number[]} The output array to add points into. If not passed, a new array is created.
 * @return {number[]} an array of points
 */
const quadraticBezierCurve = function (fromX, fromY, cpX, cpY, toX, toY, out=[])
{
    const n = 20,
        points = out;

    let xa,
        ya,
        xb,
        yb,
        x,
        y;

    function getPt(n1 , n2, perc)
    {
        const diff = n2 - n1;

        return n1 + ( diff * perc );
    }

    for (let i = 0, j = 0; i <= n; i++)
    {
        j = i / n;

        // The Green Line
        xa = getPt( fromX , cpX , j );
        ya = getPt( fromY , cpY , j );
        xb = getPt( cpX , toX , j );
        yb = getPt( cpY , toY , j );

        // The Black Dot
        x = getPt( xa , xb , j );
        y = getPt( ya , yb , j );

        points.push(x, y);
    }

    return points;
};

export default buildRoundedRectangle;
