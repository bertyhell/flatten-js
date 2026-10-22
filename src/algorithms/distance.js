"use strict";

// let IntervalTree = require('flatten-interval-tree');
import IntervalTree from '@flatten-js/interval-tree';
import * as Intersection from '../algorithms/intersection';
import Flatten from '../flatten';


export class Distance {
    /**
     * Calculate distance and shortest segment between points
     * @param pt1
     * @param pt2
     * @returns {[number, Flatten.Segment]} - distance and shortest segment
     */
    static point2point(pt1, pt2) {
        return pt1.distanceTo(pt2);
    }

    /**
     * Calculate distance and shortest segment between point and line
     * @param pt
     * @param line
     * @returns {[number, Flatten.Segment]} - distance and shortest segment
     */
    static point2line(pt, line) {
        let closest_point = pt.projectionOn(line);
        let vec = new Flatten.Vector(pt, closest_point);
        return [vec.length, new Flatten.Segment(pt, closest_point)];
    }

    /**
     * Calculate distance and shortest segment between point and circle
     * @param pt
     * @param circle
     * @returns {[number, Flatten.Segment]} - distance and shortest segment
     */
    static point2circle(pt, circle) {
        let [dist2center, shortest_dist] = pt.distanceTo(circle.center);
        if (Flatten.Utils.EQ_0(dist2center)) {
            return [circle.r, new Flatten.Segment(pt, circle.toArc().start)];
        } else {
            let dist = Math.abs(dist2center - circle.r);
            let v = new Flatten.Vector(circle.pc, pt).normalize().multiply(circle.r);
            let closest_point = circle.pc.translate(v);
            return [dist, new Flatten.Segment(pt, closest_point)];
        }
    }

    /**
     * Calculate distance and shortest segment between point and segment
     * @param pt
     * @param segment
     * @returns {[number, Flatten.Segment]} - distance and shortest segment
     */
    static point2segment(pt, segment) {
        /* Degenerated case of zero-length segment */
        if (segment.start.equalTo(segment.end)) {
            return Distance.point2point(pt, segment.start);
        }

        let v_seg = new Flatten.Vector(segment.start, segment.end);
        let v_ps2pt = new Flatten.Vector(segment.start, pt);
        let v_pe2pt = new Flatten.Vector(segment.end, pt);
        let start_sp = v_seg.dot(v_ps2pt);
        /* dot product v_seg * v_ps2pt */
        let end_sp = -v_seg.dot(v_pe2pt);
        /* minus dot product v_seg * v_pe2pt */

        let dist;
        let closest_point;
        if (Flatten.Utils.GE(start_sp, 0) && Flatten.Utils.GE(end_sp, 0)) {    /* point inside segment scope */
            let v_unit = segment.tangentInStart(); // new Flatten.Vector(v_seg.x / this.length, v_seg.y / this.length);
            /* unit vector ||v_unit|| = 1 */
            dist = Math.abs(v_unit.cross(v_ps2pt));
            /* dist = abs(v_unit x v_ps2pt) */
            closest_point = segment.start.translate(v_unit.multiply(v_unit.dot(v_ps2pt)));
            return [dist, new Flatten.Segment(pt, closest_point)];
        } else if (start_sp < 0) {                             /* point is out of scope closer to ps */
            return pt.distanceTo(segment.start);
        } else {                                               /* point is out of scope closer to pe */
            return pt.distanceTo(segment.end);
        }
    };

    /**
     * Calculate distance and shortest segment between point and arc
     * @param pt
     * @param arc
     * @returns {[number, Flatten.Segment]} - distance and shortest segment
     */
    static point2arc(pt, arc) {
        let circle = new Flatten.Circle(arc.pc, arc.r);
        let dist_and_segment = [];
        let dist, shortest_segment;
        [dist, shortest_segment] = Distance.point2circle(pt, circle);
        if (shortest_segment.end.on(arc)) {
            dist_and_segment.push(Distance.point2circle(pt, circle));
        }
        dist_and_segment.push(Distance.point2point(pt, arc.start));
        dist_and_segment.push(Distance.point2point(pt, arc.end));

        Distance.sort(dist_and_segment);

        return dist_and_segment[0];
    }

    /**
     * Calculate distance and shortest segment between point and edge
     * @param pt
     * @param edge
     * @returns {[number, Flatten.Segment]}
     */
    static point2edge(pt, edge) {
        if (edge.shape instanceof Flatten.Segment) {
            return Distance.point2segment(pt, edge.shape);
        }
        if (edge.shape instanceof Flatten.EllipticArc) {
            return Distance.point2ellipticArc(pt, edge.shape);
        }
        return Distance.point2arc(pt, edge.shape);
    }

    /**
     * Calculate distance and shortest segment between segment and line
     * @param seg
     * @param line
     * @returns {[number, Flatten.Segment]}
     */
    static segment2line(seg, line) {
        let ip = seg.intersect(line);
        if (ip.length > 0) {
            return [0, new Flatten.Segment(ip[0], ip[0])];   // distance = 0, closest point is the first point
        }
        let dist_and_segment = [];
        dist_and_segment.push(Distance.point2line(seg.start, line));
        dist_and_segment.push(Distance.point2line(seg.end, line));

        Distance.sort(dist_and_segment);
        return dist_and_segment[0];

    }

    /**
     * Calculate distance and shortest segment between two segments
     * @param seg1
     * @param seg2
     * @returns {[number, Flatten.Segment]} - distance and shortest segment
     */
    static segment2segment(seg1, seg2) {
        let ip = Intersection.intersectSegment2Segment(seg1, seg2);
        if (ip.length > 0) {
            return [0, new Flatten.Segment(ip[0], ip[0])];   // distance = 0, closest point is the first point
        }

        // Seg1 and seg2 not intersected
        let dist_and_segment = [];
        let dist_tmp, shortest_segment_tmp
        [dist_tmp, shortest_segment_tmp] = Distance.point2segment(seg2.start, seg1);
        dist_and_segment.push([dist_tmp, shortest_segment_tmp.reverse()]);
        [dist_tmp, shortest_segment_tmp] = Distance.point2segment(seg2.end, seg1);
        dist_and_segment.push([dist_tmp, shortest_segment_tmp.reverse()]);
        dist_and_segment.push(Distance.point2segment(seg1.start, seg2));
        dist_and_segment.push(Distance.point2segment(seg1.end, seg2));

        Distance.sort(dist_and_segment);
        return dist_and_segment[0];
    }

    /**
     * Calculate distance and shortest segment between segment and circle
     * @param seg
     * @param circle
     * @returns {[number, Flatten.Segment]} - distance and shortest segment
     */
    static segment2circle(seg, circle) {
        /* Case 1 Segment and circle intersected. Return the first point and zero distance */
        let ip = seg.intersect(circle);
        if (ip.length > 0) {
            return [0, new Flatten.Segment(ip[0], ip[0])];
        }

        // No intersection between segment and circle

        /* Case 2. Distance to projection of center point to line bigger than radius
         * And projection point belong to segment
          * Then measure again distance from projection to circle and return it */
        let line = new Flatten.Line(seg.ps, seg.pe);
        let [dist, shortest_segment] = Distance.point2line(circle.center, line);
        if (Flatten.Utils.GE(dist, circle.r) && shortest_segment.end.on(seg)) {
            return Distance.point2circle(shortest_segment.end, circle);
        }
        /* Case 3. Otherwise closest point is one of the end points of the segment */
        else {
            let [dist_from_start, shortest_segment_from_start] = Distance.point2circle(seg.start, circle);
            let [dist_from_end, shortest_segment_from_end] = Distance.point2circle(seg.end, circle);
            return Flatten.Utils.LT(dist_from_start, dist_from_end) ?
                [dist_from_start, shortest_segment_from_start] :
                [dist_from_end, shortest_segment_from_end];
        }
    }

    /**
     * Calculate distance and shortest segment between segment and arc
     * @param seg
     * @param arc
     * @returns {[number, Flatten.Segment]} - distance and shortest segment
     */
    static segment2arc(seg, arc) {
        /* Case 1 Segment and arc intersected. Return the first point and zero distance */
        let ip = seg.intersect(arc);
        if (ip.length > 0) {
            return [0, new Flatten.Segment(ip[0], ip[0])];
        }

        // No intersection between segment and arc
        let line = new Flatten.Line(seg.ps, seg.pe);
        let circle = new Flatten.Circle(arc.pc, arc.r);

        /* Case 2. Distance to projection of center point to line bigger than radius AND
         * projection point belongs to segment AND
           * distance from projection point to circle belongs to arc  =>
           * return this distance from projection to circle */
        let [dist_from_center, shortest_segment_from_center] = Distance.point2line(circle.center, line);
        if (Flatten.Utils.GE(dist_from_center, circle.r) && shortest_segment_from_center.end.on(seg)) {
            let [dist_from_projection, shortest_segment_from_projection] =
                Distance.point2circle(shortest_segment_from_center.end, circle);
            if (shortest_segment_from_projection.end.on(arc)) {
                return [dist_from_projection, shortest_segment_from_projection];
            }
        }
        /* Case 3. Otherwise closest point is one of the end points of the segment */
        let dist_and_segment = [];
        dist_and_segment.push(Distance.point2arc(seg.start, arc));
        dist_and_segment.push(Distance.point2arc(seg.end, arc));

        let dist_tmp, segment_tmp;
        [dist_tmp, segment_tmp] = Distance.point2segment(arc.start, seg);
        dist_and_segment.push([dist_tmp, segment_tmp.reverse()]);

        [dist_tmp, segment_tmp] = Distance.point2segment(arc.end, seg);
        dist_and_segment.push([dist_tmp, segment_tmp.reverse()]);

        Distance.sort(dist_and_segment);
        return dist_and_segment[0];
    }

    /**
     * Calculate distance and shortest segment between two circles
     * @param circle1
     * @param circle2
     * @returns {[number, Flatten.Segment]} - distance and shortest segment
     */
    static circle2circle(circle1, circle2) {
        let ip = circle1.intersect(circle2);
        if (ip.length > 0) {
            return [0, new Flatten.Segment(ip[0], ip[0])];
        }

        // Case 1. Concentric circles. Convert to arcs and take distance between two arc starts
        if (circle1.center.equalTo(circle2.center)) {
            let arc1 = circle1.toArc();
            let arc2 = circle2.toArc();
            return Distance.point2point(arc1.start, arc2.start);
        } else {
            // Case 2. Not concentric circles
            let line = new Flatten.Line(circle1.center, circle2.center);
            let ip1 = line.intersect(circle1);
            let ip2 = line.intersect(circle2);

            let dist_and_segment = [];

            dist_and_segment.push(Distance.point2point(ip1[0], ip2[0]));
            dist_and_segment.push(Distance.point2point(ip1[0], ip2[1]));
            dist_and_segment.push(Distance.point2point(ip1[1], ip2[0]));
            dist_and_segment.push(Distance.point2point(ip1[1], ip2[1]));

            Distance.sort(dist_and_segment);
            return dist_and_segment[0];
        }
    }

    /**
     * Calculate distance and shortest segment between two circles
     * @param circle
     * @param line
     * @returns {[number, Flatten.Segment]} - distance and shortest segment
     */
    static circle2line(circle, line) {
        let ip = circle.intersect(line);
        if (ip.length > 0) {
            return [0, new Flatten.Segment(ip[0], ip[0])];
        }

        let [dist_from_center, shortest_segment_from_center] = Distance.point2line(circle.center, line);
        let [dist, shortest_segment] = Distance.point2circle(shortest_segment_from_center.end, circle);
        shortest_segment = shortest_segment.reverse();
        return [dist, shortest_segment];
    }

    /**
     * Calculate distance and shortest segment between arc and line
     * @param arc
     * @param line
     * @returns {[number, Flatten.Segment]} - distance and shortest segment
     */
    static arc2line(arc, line) {
        /* Case 1 Line and arc intersected. Return the first point and zero distance */
        let ip = line.intersect(arc);
        if (ip.length > 0) {
            return [0, new Flatten.Segment(ip[0], ip[0])];
        }

        let circle = new Flatten.Circle(arc.center, arc.r);

        /* Case 2. Distance to projection of center point to line bigger than radius AND
         * projection point belongs to segment AND
           * distance from projection point to circle belongs to arc  =>
           * return this distance from projection to circle */
        let [dist_from_center, shortest_segment_from_center] = Distance.point2line(circle.center, line);
        if (Flatten.Utils.GE(dist_from_center, circle.r)) {
            let [dist_from_projection, shortest_segment_from_projection] =
                Distance.point2circle(shortest_segment_from_center.end, circle);
            if (shortest_segment_from_projection.end.on(arc)) {
                return [dist_from_projection, shortest_segment_from_projection];
            }
        } else {
            let dist_and_segment = [];
            dist_and_segment.push(Distance.point2line(arc.start, line));
            dist_and_segment.push(Distance.point2line(arc.end, line));

            Distance.sort(dist_and_segment);
            return dist_and_segment[0];
        }
    }

    /**
     * Calculate distance and shortest segment between arc and circle
     * @param arc
     * @param circle2
     * @returns {[number, Flatten.Segment]} - distance and shortest segment
     */
    static arc2circle(arc, circle2) {
        let ip = arc.intersect(circle2);
        if (ip.length > 0) {
            return [0, new Flatten.Segment(ip[0], ip[0])];
        }

        let circle1 = new Flatten.Circle(arc.center, arc.r);

        let [dist, shortest_segment] = Distance.circle2circle(circle1, circle2);
        if (shortest_segment.start.on(arc)) {
            return [dist, shortest_segment];
        } else {
            let dist_and_segment = [];

            dist_and_segment.push(Distance.point2circle(arc.start, circle2));
            dist_and_segment.push(Distance.point2circle(arc.end, circle2));

            Distance.sort(dist_and_segment);

            return dist_and_segment[0];
        }
    }

    /**
     * Calculate distance and shortest segment between two arcs
     * @param arc1
     * @param arc2
     * @returns {[number, Flatten.Segment]} - distance and shortest segment
     */
    static arc2arc(arc1, arc2) {
        let ip = arc1.intersect(arc2);
        if (ip.length > 0) {
            return [0, new Flatten.Segment(ip[0], ip[0])];
        }

        let circle1 = new Flatten.Circle(arc1.center, arc1.r);
        let circle2 = new Flatten.Circle(arc2.center, arc2.r);

        let [dist, shortest_segment] = Distance.circle2circle(circle1, circle2);
        if (shortest_segment.start.on(arc1) && shortest_segment.end.on(arc2)) {
            return [dist, shortest_segment];
        } else {
            let dist_and_segment = [];

            let dist_tmp, segment_tmp;

            [dist_tmp, segment_tmp] = Distance.point2arc(arc1.start, arc2);
            if (segment_tmp.end.on(arc2)) {
                dist_and_segment.push([dist_tmp, segment_tmp]);
            }

            [dist_tmp, segment_tmp] = Distance.point2arc(arc1.end, arc2);
            if (segment_tmp.end.on(arc2)) {
                dist_and_segment.push([dist_tmp, segment_tmp]);
            }

            [dist_tmp, segment_tmp] = Distance.point2arc(arc2.start, arc1);
            if (segment_tmp.end.on(arc1)) {
                dist_and_segment.push([dist_tmp, segment_tmp.reverse()]);
            }

            [dist_tmp, segment_tmp] = Distance.point2arc(arc2.end, arc1);
            if (segment_tmp.end.on(arc1)) {
                dist_and_segment.push([dist_tmp, segment_tmp.reverse()]);
            }

            [dist_tmp, segment_tmp] = Distance.point2point(arc1.start, arc2.start);
            dist_and_segment.push([dist_tmp, segment_tmp]);

            [dist_tmp, segment_tmp] = Distance.point2point(arc1.start, arc2.end);
            dist_and_segment.push([dist_tmp, segment_tmp]);

            [dist_tmp, segment_tmp] = Distance.point2point(arc1.end, arc2.start);
            dist_and_segment.push([dist_tmp, segment_tmp]);

            [dist_tmp, segment_tmp] = Distance.point2point(arc1.end, arc2.end);
            dist_and_segment.push([dist_tmp, segment_tmp]);

            Distance.sort(dist_and_segment);

            return dist_and_segment[0];
        }
    }

    /**
     * Calculate distance and shortest segment between point and polygon
     * @param point
     * @param polygon
     * @returns {[number, Flatten.Segment]} - distance and shortest segment
     */
    static point2polygon(point, polygon) {
        let min_dist_and_segment = [Number.POSITIVE_INFINITY, new Flatten.Segment()];
        for (let edge of polygon.edges) {
            let [dist, shortest_segment] = Distance.point2edge(point, edge);
            if (Flatten.Utils.LT(dist, min_dist_and_segment[0])) {
                min_dist_and_segment = [dist, shortest_segment];
            }
        }
        return min_dist_and_segment;
    }

    static shape2polygon(shape, polygon) {
        let min_dist_and_segment = [Number.POSITIVE_INFINITY, new Flatten.Segment()];
        for (let edge of polygon.edges) {
            let [dist, shortest_segment] = shape.distanceTo(edge.shape);
            if (Flatten.Utils.LT(dist, min_dist_and_segment[0])) {
                min_dist_and_segment = [dist, shortest_segment];
            }
        }
        return min_dist_and_segment;
    }

    /**
     * Calculate distance and shortest segment between two polygons
     * @param polygon1
     * @param polygon2
     * @returns {[number, Flatten.Segment]} - distance and shortest segment
     */
    static polygon2polygon(polygon1, polygon2) {
        let min_dist_and_segment = [Number.POSITIVE_INFINITY, new Flatten.Segment()];
        for (let edge1 of polygon1.edges) {
            for (let edge2 of polygon2.edges) {
                let [dist, shortest_segment] = edge1.shape.distanceTo(edge2.shape);
                if (Flatten.Utils.LT(dist, min_dist_and_segment[0])) {
                    min_dist_and_segment = [dist, shortest_segment];
                }
            }
        }
        return min_dist_and_segment;
    }

    /**
     * Returns [mindist, maxdist] array of squared minimal and maximal distance between boxes
     * Minimal distance by x is
     *    (box2.xmin - box1.xmax), if box1 is left to box2
     *    (box1.xmin - box2.xmax), if box2 is left to box1
     *    0,                       if box1 and box2 are intersected by x
     * Minimal distance by y is defined in the same way
     *
     * Maximal distance is estimated as a sum of squared dimensions of the merged box
     *
     * @param box1
     * @param box2
     * @returns {Number | Number} - minimal and maximal distance
     */
    static box2box_minmax(box1, box2) {
        let mindist_x = Math.max(Math.max(box1.xmin - box2.xmax, 0), Math.max(box2.xmin - box1.xmax, 0));
        let mindist_y = Math.max(Math.max(box1.ymin - box2.ymax, 0), Math.max(box2.ymin - box1.ymax, 0));
        let mindist = mindist_x * mindist_x + mindist_y * mindist_y;

        let box = box1.merge(box2);
        let dx = box.xmax - box.xmin;
        let dy = box.ymax - box.ymin;
        let maxdist = dx * dx + dy * dy;

        return [mindist, maxdist];
    }

    static minmax_tree_process_level(shape, level, min_stop, tree) {
        // Calculate minmax distance to each shape in current level
        // Insert result into the interval tree for further processing
        // update min_stop with maxdist, it will be the new stop distance
        let mindist, maxdist;
        for (let node of level) {

            // [mindist, maxdist] = Distance.box2box_minmax(shape.box, node.max);
            // if (Flatten.Utils.GT(mindist, min_stop))
            //     continue;

            // Estimate min-max dist to the shape stored in the node.items, using node.item.key which is shape's box
            [mindist, maxdist] = Distance.box2box_minmax(shape.box, node.item.key);
            for (let value of node.item.values) {
                if (value instanceof Flatten.Edge) {
                    tree.insert([mindist, maxdist], value.shape);
                } else {
                    tree.insert([mindist, maxdist], value);
                }
            }

            if (Flatten.Utils.LT(maxdist, min_stop)) {
                min_stop = maxdist;                       // this will be the new distance estimation
            }
        }

        if (level.length === 0)
            return min_stop;

        // Calculate new level from left and right children of the current
        let new_level_left = level.map(node => node.left.isNil() ? undefined : node.left).filter(node => node !== undefined);
        let new_level_right = level.map(node => node.right.isNil() ? undefined : node.right).filter(node => node !== undefined);
        // Merge left and right subtrees and leave only relevant subtrees
        let new_level = [...new_level_left, ...new_level_right].filter(node => {
            // Node subtree quick reject, node.max is a subtree box
            let [mindist, maxdist] = Distance.box2box_minmax(shape.box, node.max);
            return (Flatten.Utils.LE(mindist, min_stop));
        });

        min_stop = Distance.minmax_tree_process_level(shape, new_level, min_stop, tree);
        return min_stop;
    }

    /**
     * Calculates sorted tree of [mindist, maxdist] intervals between query shape
     * and shapes of the planar set.
     * @param shape
     * @param set
     */
    static minmax_tree(shape, set, min_stop) {
        let tree = new IntervalTree();
        let level = [set.index.root];
        let squared_min_stop = min_stop < Number.POSITIVE_INFINITY ? min_stop * min_stop : Number.POSITIVE_INFINITY;
        squared_min_stop = Distance.minmax_tree_process_level(shape, level, squared_min_stop, tree);
        return tree;
    }

    static minmax_tree_calc_distance(shape, node, min_dist_and_segment) {
        let min_dist_and_segment_new, stop;
        if (node != null && !node.isNil()) {
            [min_dist_and_segment_new, stop] = Distance.minmax_tree_calc_distance(shape, node.left, min_dist_and_segment);

            if (stop) {
                return [min_dist_and_segment_new, stop];
            }

            if (Flatten.Utils.LT(min_dist_and_segment_new[0], Math.sqrt(node.item.key.low))) {
                return [min_dist_and_segment_new, true];   // stop condition
            }

            let [dist, shortest_segment] = Distance.distanceToArray(shape, node.item.values);
            if (Flatten.Utils.LT(dist, min_dist_and_segment_new[0])) {
                min_dist_and_segment_new = [dist, shortest_segment];
            }

            [min_dist_and_segment_new, stop] = Distance.minmax_tree_calc_distance(shape, node.right, min_dist_and_segment_new);

            return [min_dist_and_segment_new, stop];
        }

        return [min_dist_and_segment, false];
    }

    /**
     * Calculates distance between shape and Planar Set of shapes
     * @param shape
     * @param {PlanarSet} set
     * @param {Number} min_stop
     * @returns {*}
     */
    static shape2planarSet(shape, set, min_stop = Number.POSITIVE_INFINITY) {
        let min_dist_and_segment = [min_stop, new Flatten.Segment()];
        let stop = false;
        if (set instanceof Flatten.PlanarSet) {
            let tree = Distance.minmax_tree(shape, set, min_stop);
            [min_dist_and_segment, stop] = Distance.minmax_tree_calc_distance(shape, tree.root, min_dist_and_segment);
        }
        return min_dist_and_segment;
    }

    /**
     * Calculate distance and shortest segment between point and ellipse. <br/>
     * Uses robust bisection method by David Eberly, "Distance from a Point to an Ellipse,
     * an Ellipsoid, or a Hyperellipsoid"
     * @param pt
     * @param ellipse
     * @returns {[number, Flatten.Segment]} - distance and shortest segment
     */
    static point2ellipse(pt, ellipse) {
        let {pc, rx, ry, angle} = ellipse;
        let cos = Math.cos(angle);
        let sin = Math.sin(angle);
        let dx = pt.x - pc.x;
        let dy = pt.y - pc.y;
        // coordinates in the frame of the ellipse axes
        let lx = cos * dx + sin * dy;
        let ly = -sin * dx + cos * dy;

        // algorithm requires e0 >= e1 and point in the first quadrant
        let swap = rx < ry;
        let e0 = swap ? ry : rx;
        let e1 = swap ? rx : ry;
        let y0 = Math.abs(swap ? ly : lx);
        let y1 = Math.abs(swap ? lx : ly);

        let [x0, x1] = closestPointOnAxisAlignedEllipse(e0, e1, y0, y1);

        let qx = (swap ? x1 : x0) * (lx < 0 ? -1 : 1);
        let qy = (swap ? x0 : x1) * (ly < 0 ? -1 : 1);
        let closest_point = new Flatten.Point(pc.x + cos * qx - sin * qy, pc.y + sin * qx + cos * qy);
        return [pt.distanceTo(closest_point)[0], new Flatten.Segment(pt, closest_point)];
    }

    /**
     * Calculate distance and shortest segment between point and elliptic arc
     * @param pt
     * @param ellipticArc
     * @returns {[number, Flatten.Segment]} - distance and shortest segment
     */
    static point2ellipticArc(pt, ellipticArc) {
        let [dist, shortest_segment] = Distance.point2ellipse(pt, ellipticArc.ellipse);
        if (shortest_segment.end.on(ellipticArc)) {
            return [dist, shortest_segment];
        }
        [dist, shortest_segment] = Distance.ellipticArc2shape(ellipticArc, (p) => Distance.point2point(p, pt));
        return [dist, shortest_segment.reverse()];
    }

    /**
     * Calculate distance and shortest segment between ellipse and line
     * @param ellipse
     * @param line
     * @returns {[number, Flatten.Segment]} - distance and shortest segment
     */
    static ellipse2line(ellipse, line) {
        let ip = ellipse.intersect(line);
        if (ip.length > 0) {
            return [0, new Flatten.Segment(ip[0], ip[0])];
        }

        // Closest point is the point of the ellipse with the normal parallel to the normal of the line
        let norm = line.norm.normalize();
        let side = norm.dot(new Flatten.Vector(line.pt, ellipse.pc));
        let d = side > 0 ? norm.invert() : norm;   // direction from ellipse toward the line

        let cos = Math.cos(ellipse.angle);
        let sin = Math.sin(ellipse.angle);
        let w0 = ellipse.rx * (cos * d.x + sin * d.y);
        let w1 = ellipse.ry * (-sin * d.x + cos * d.y);
        let t = Math.atan2(w1, w0);
        let closest_point = ellipse.pointAt(t);

        return Distance.point2line(closest_point, line);
    }

    /**
     * Calculate distance and shortest segment between segment and ellipse
     * @param seg
     * @param ellipse
     * @returns {[number, Flatten.Segment]} - distance and shortest segment
     */
    static segment2ellipse(seg, ellipse) {
        let ip = Intersection.intersectSegment2Ellipse(seg, ellipse);
        if (ip.length > 0) {
            return [0, new Flatten.Segment(ip[0], ip[0])];
        }

        let dist_and_segment = [];
        dist_and_segment.push(Distance.point2ellipse(seg.start, ellipse));
        dist_and_segment.push(Distance.point2ellipse(seg.end, ellipse));

        // When the line does not intersect the ellipse, closest point may be inside the segment
        if (!seg.isZeroLength()) {
            let line = new Flatten.Line(seg.ps, seg.pe);
            if (Intersection.intersectLine2Ellipse(line, ellipse).length === 0) {
                let [dist, shortest_segment] = Distance.ellipse2line(ellipse, line);
                if (shortest_segment.end.on(seg)) {
                    dist_and_segment.push([dist, shortest_segment.reverse()]);
                }
            }
        }

        Distance.sort(dist_and_segment);
        return dist_and_segment[0];
    }

    /**
     * Calculate distance and shortest segment between ellipse and circle
     * @param ellipse
     * @param circle
     * @returns {[number, Flatten.Segment]} - distance and shortest segment
     */
    static ellipse2circle(ellipse, circle) {
        let ip = ellipse.intersect(circle);
        if (ip.length > 0) {
            return [0, new Flatten.Segment(ip[0], ip[0])];
        }
        return Distance.ellipse2shape(ellipse, (pt) => Distance.point2circle(pt, circle));
    }

    /**
     * Calculate distance and shortest segment between ellipse and arc
     * @param ellipse
     * @param arc
     * @returns {[number, Flatten.Segment]} - distance and shortest segment
     */
    static ellipse2arc(ellipse, arc) {
        let ip = ellipse.intersect(arc);
        if (ip.length > 0) {
            return [0, new Flatten.Segment(ip[0], ip[0])];
        }
        return Distance.ellipse2shape(ellipse, (pt) => Distance.point2arc(pt, arc));
    }

    /**
     * Calculate distance and shortest segment between two ellipses
     * @param ellipse1
     * @param ellipse2
     * @returns {[number, Flatten.Segment]} - distance and shortest segment
     */
    static ellipse2ellipse(ellipse1, ellipse2) {
        let ip = ellipse1.intersect(ellipse2);
        if (ip.length > 0) {
            return [0, new Flatten.Segment(ip[0], ip[0])];
        }
        return Distance.ellipse2shape(ellipse1, (pt) => Distance.point2ellipse(pt, ellipse2));
    }

    /**
     * Calculate distance and shortest segment between elliptic arc and line
     * @param ellipticArc
     * @param line
     * @returns {[number, Flatten.Segment]} - distance and shortest segment
     */
    static ellipticArc2line(ellipticArc, line) {
        return Distance.ellipticArc2shapeWithIntersection(ellipticArc, line,
            (pt) => Distance.point2line(pt, line));
    }

    /**
     * Calculate distance and shortest segment between elliptic arc and segment
     * @param ellipticArc
     * @param segment
     * @returns {[number, Flatten.Segment]} - distance and shortest segment
     */
    static ellipticArc2segment(ellipticArc, segment) {
        return Distance.ellipticArc2shapeWithIntersection(ellipticArc, segment,
            (pt) => Distance.point2segment(pt, segment));
    }

    /**
     * Calculate distance and shortest segment between elliptic arc and circle
     * @param ellipticArc
     * @param circle
     * @returns {[number, Flatten.Segment]} - distance and shortest segment
     */
    static ellipticArc2circle(ellipticArc, circle) {
        return Distance.ellipticArc2shapeWithIntersection(ellipticArc, circle,
            (pt) => Distance.point2circle(pt, circle));
    }

    /**
     * Calculate distance and shortest segment between elliptic arc and arc
     * @param ellipticArc
     * @param arc
     * @returns {[number, Flatten.Segment]} - distance and shortest segment
     */
    static ellipticArc2arc(ellipticArc, arc) {
        return Distance.ellipticArc2shapeWithIntersection(ellipticArc, arc,
            (pt) => Distance.point2arc(pt, arc));
    }

    /**
     * Calculate distance and shortest segment between elliptic arc and ellipse
     * @param ellipticArc
     * @param ellipse
     * @returns {[number, Flatten.Segment]} - distance and shortest segment
     */
    static ellipticArc2ellipse(ellipticArc, ellipse) {
        return Distance.ellipticArc2shapeWithIntersection(ellipticArc, ellipse,
            (pt) => Distance.point2ellipse(pt, ellipse));
    }

    /**
     * Calculate distance and shortest segment between two elliptic arcs
     * @param ellipticArc1
     * @param ellipticArc2
     * @returns {[number, Flatten.Segment]} - distance and shortest segment
     */
    static ellipticArc2ellipticArc(ellipticArc1, ellipticArc2) {
        return Distance.ellipticArc2shapeWithIntersection(ellipticArc1, ellipticArc2,
            (pt) => Distance.point2ellipticArc(pt, ellipticArc2));
    }

    static ellipticArc2shapeWithIntersection(ellipticArc, shape, point2shape) {
        let ip = ellipticArc.intersect(shape);
        if (ip.length > 0) {
            return [0, new Flatten.Segment(ip[0], ip[0])];
        }
        return Distance.ellipticArc2shape(ellipticArc, point2shape);
    }

    /**
     * Calculate distance from the ellipse to the shape numerically,
     * minimizing distance from the point of the ellipse to the shape
     * @param ellipse
     * @param {function} point2shape - function that returns [distance, shortest segment] from point to shape
     * @returns {[number, Flatten.Segment]} - distance and shortest segment
     */
    static ellipse2shape(ellipse, point2shape) {
        return minimizeOnCurve(ellipse, 0, Flatten.PIx2, point2shape);
    }

    /**
     * Calculate distance from the elliptic arc to the shape numerically,
     * minimizing distance from the point of the elliptic arc to the shape
     * @param ellipticArc
     * @param {function} point2shape - function that returns [distance, shortest segment] from point to shape
     * @returns {[number, Flatten.Segment]} - distance and shortest segment
     */
    static ellipticArc2shape(ellipticArc, point2shape) {
        let sweep = ellipticArc.sweep;
        let t0 = ellipticArc.counterClockwise ? ellipticArc.startAngle : ellipticArc.startAngle - sweep;
        return minimizeOnCurve(ellipticArc, t0, t0 + sweep, point2shape);
    }

    static sort(dist_and_segment) {
        dist_and_segment.sort((d1, d2) => {
            if (Flatten.Utils.LT(d1[0], d2[0])) {
                return -1;
            }
            if (Flatten.Utils.GT(d1[0], d2[0])) {
                return 1;
            }
            return 0;
        });
    }

    static distance(shape1, shape2) {
        return shape1.distanceTo(shape2);
    }

    static distanceToArray(shape1, shapes) {
        let min_dist_and_segment = [Number.POSITIVE_INFINITY, new Flatten.Segment()];
        for (let shape2 of shapes) {
            let [dist, shortest_segment] = shape1.distanceTo(shape2);
            if (Flatten.Utils.LT(dist, min_dist_and_segment[0])) {
                min_dist_and_segment = [dist, shortest_segment];
            }
        }
        return min_dist_and_segment;
    }

    /**
     * Calculate distance and shortest segment any shape and multiline
     * @param shape
     * @param multiline
     * @returns {[number, Flatten.Segment]}
     */
    static shape2multiline(shape, multiline) {
        let min_dist_and_segment = [Number.POSITIVE_INFINITY, new Flatten.Segment()];
        for (let edge of multiline) {
            let [dist, shortest_segment] = Distance.distance(shape, edge.shape);
            if (Flatten.Utils.LT(dist, min_dist_and_segment[0])) {
                min_dist_and_segment = [dist, shortest_segment];
            }
        }
        return min_dist_and_segment;
    }

    /**
     * Calculate distance and shortest segment between two multilines
     * @param multiline1
     * @param multiline2
     * @returns {[number, Flatten.Segment]}
     */
    static multiline2multiline(multiline1, multiline2) {
        let min_dist_and_segment = [Number.POSITIVE_INFINITY, new Flatten.Segment()];
        for (let edge1 of multiline1) {
            for (let edge2 of multiline2) {
                let [dist, shortest_segment] = Distance.distance(edge1.shape, edge2.shape);
                if (Flatten.Utils.LT(dist, min_dist_and_segment[0])) {
                    min_dist_and_segment = [dist, shortest_segment];
                }
            }
        }
        return min_dist_and_segment;
    }
}

Flatten.Distance = Distance;

/**
 * Find closest point of the axis-aligned ellipse (x/e0)^2 + (y/e1)^2 = 1, e0 >= e1,
 * to the point (y0, y1) in the first quadrant
 * @returns {number[]} coordinates of the closest point
 */
function closestPointOnAxisAlignedEllipse(e0, e1, y0, y1) {
    if (e1 === 0) {
        return [Math.min(y0, e0), 0];
    }
    if (y1 > 0) {
        if (y0 > 0) {
            let z0 = y0 / e0;
            let z1 = y1 / e1;
            let g = z0 * z0 + z1 * z1 - 1;
            if (g !== 0) {
                let r0 = (e0 / e1) * (e0 / e1);
                let sbar = getRoot(r0, z0, z1, g);
                return [r0 * y0 / (sbar + r0), y1 / (sbar + 1)];
            }
            return [y0, y1];
        }
        return [0, e1];
    }
    let numer0 = e0 * y0;
    let denom0 = e0 * e0 - e1 * e1;
    if (numer0 < denom0) {
        let xde0 = numer0 / denom0;
        return [e0 * xde0, e1 * Math.sqrt(1 - xde0 * xde0)];
    }
    return [e0, 0];
}

function getRoot(r0, z0, z1, g) {
    let n0 = r0 * z0;
    let s0 = z1 - 1;
    let s1 = g < 0 ? 0 : Math.hypot(n0, z1) - 1;
    let s = 0;
    for (let i = 0; i < 1100; i++) {
        s = (s0 + s1) / 2;
        if (s === s0 || s === s1) break;
        let ratio0 = n0 / (s + r0);
        let ratio1 = z1 / (s + 1);
        g = ratio0 * ratio0 + ratio1 * ratio1 - 1;
        if (g > 0) {
            s0 = s;
        } else if (g < 0) {
            s1 = s;
        } else {
            break;
        }
    }
    return s;
}

const CURVE_SAMPLES = 72;
const GOLDEN_RATIO = (Math.sqrt(5) - 1) / 2;

/**
 * Minimize distance from the point of the curve to the shape, where curve point is curve.pointAt(t), t in [t0, t1].
 * Parameter is sampled and every local minimum is refined by golden section search
 * @returns {[number, Flatten.Segment]} - distance and shortest segment (started at curve)
 */
function minimizeOnCurve(curve, t0, t1, point2shape) {
    let n = Math.max(8, Math.ceil(CURVE_SAMPLES * (t1 - t0) / Flatten.PIx2));
    let step = (t1 - t0) / n;
    let dist = (t) => point2shape(curve.pointAt(t))[0];

    let ts = [];
    let ds = [];
    for (let i = 0; i <= n; i++) {
        let t = i === n ? t1 : t0 + i * step;
        ts.push(t);
        ds.push(dist(t));
    }

    let best_t = ts[0];
    let best_dist = ds[0];
    if (ds[n] < best_dist) {
        best_t = ts[n];
        best_dist = ds[n];
    }

    for (let i = 0; i <= n; i++) {
        let prev = i > 0 ? ds[i - 1] : Number.POSITIVE_INFINITY;
        let next = i < n ? ds[i + 1] : Number.POSITIVE_INFINITY;
        if (ds[i] > prev || ds[i] > next) continue;

        let a = ts[Math.max(i - 1, 0)];
        let b = ts[Math.min(i + 1, n)];
        let t = goldenSectionMin(dist, a, b);
        let d = dist(t);
        if (d < best_dist) {
            best_dist = d;
            best_t = t;
        }
        if (ds[i] < best_dist) {
            best_dist = ds[i];
            best_t = ts[i];
        }
    }

    return point2shape(curve.pointAt(best_t));
}

function goldenSectionMin(f, a, b) {
    let c = b - GOLDEN_RATIO * (b - a);
    let d = a + GOLDEN_RATIO * (b - a);
    let fc = f(c);
    let fd = f(d);
    for (let i = 0; i < 200 && b - a > 1e-15; i++) {
        if (fc < fd) {
            b = d; d = c; fd = fc;
            c = b - GOLDEN_RATIO * (b - a);
            fc = f(c);
        } else {
            a = c; c = d; fc = fd;
            d = a + GOLDEN_RATIO * (b - a);
            fd = f(d);
        }
    }
    return (a + b) / 2;
}
