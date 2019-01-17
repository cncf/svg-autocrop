module.exports = function boxMatching(viewport1, viewport2) {
    const bb1 = { x1: viewport1.x, y1: viewport1.y, x2: viewport1.x + viewport1.width, y2: viewport1.y + viewport1.height };
    const bb2 = { x1: viewport2.x, y1: viewport2.y, x2: viewport2.x + viewport2.width, y2: viewport2.y + viewport2.height };
    const xLeft = Math.max(bb1['x1'], bb2['x1'])
    const yTop = Math.max(bb1['y1'], bb2['y1'])
    const xRight = Math.min(bb1['x2'], bb2['x2'])
    const yBottom = Math.min(bb1['y2'], bb2['y2'])

    if (xRight < xLeft || yBottom < yTop) {
        return 0.0
    }

    // The intersection of two axis-aligned bounding boxes is always an
    // axis-aligned bounding box
    const intersectionArea = (xRight - xLeft) * (yBottom - yTop);

    // compute the area of both AABBs
    const bb1Area = (bb1['x2'] - bb1['x1']) * (bb1['y2'] - bb1['y1'])
    const bb2Area = (bb2['x2'] - bb2['x1']) * (bb2['y2'] - bb2['y1'])

    const matching = intersectionArea / (bb1Area + bb2Area - intersectionArea);
    return matching;
}
const boxMatching = module.exports;

function main() {
    function parse(s) {
        return {
            x: +s.split(' ')[0],
            y: +s.split(' ')[1],
            width: +s.split(' ')[2],
            height: +s.split(' ')[3]
        };
    }
    console.info(boxMatching(parse('-10.98 -7.98 726.96 269.96'), parse('-12.00 -8.00 728.00 270.00'))); // 0.9984
}
// main();
