/**
 * Intersection
 *
 * */


"use strict";

import Flatten from "../flatten";
import {Errors} from "../utils/errors";

export function intersectLine2Line(line1, line2) {
    let ip = [];

    let [A1, B1, C1] = line1.standard;
    let [A2, B2, C2] = line2.standard;

    /* Cramer's rule */
    let det = A1 * B2 - B1 * A2;
    let detX = C1 * B2 - B1 * C2;
    let detY = A1 * C2 - C1 * A2;

    if (!Flatten.Utils.EQ_0(det)) {
        let x, y;

        if (B1 === 0) {        // vertical line x  = C1/A1, where A1 == +1 or -1
            x = C1/A1;
            y = detY / det;
        }
        else if (B2 === 0) {   // vertical line x = C2/A2, where A2 = +1 or -1
            x = C2/A2;
            y = detY / det;
        }
        else if (A1 === 0) {   // horizontal line y = C1/B1, where B1 = +1 or -1
            x = detX / det;
            y = C1/B1;
        }
        else if (A2 === 0) {   // horizontal line y = C2/B2, where B2 = +1 or -1
            x = detX / det;
            y = C2/B2;
        }
        else {
            x = detX / det;
            y = detY / det;
        }

        ip.push(new Flatten.Point(x, y));
    }

    return ip;
}

export function intersectLine2Circle(line, circle) {
    let ip = [];
    let prj = circle.pc.projectionOn(line);            // projection of circle center on a line
    let dist = circle.pc.distanceTo(prj)[0];           // distance from circle center to projection

    if (Flatten.Utils.EQ(dist, circle.r)) {            // line tangent to circle - return single intersection point
        ip.push(prj);
    } else if (Flatten.Utils.LT(dist, circle.r)) {       // return two intersection points
        let delta = Math.sqrt(circle.r * circle.r - dist * dist);
        let v_trans, pt;

        v_trans = line.norm.rotate90CCW().multiply(delta);
        pt = prj.translate(v_trans);
        ip.push(pt);

        v_trans = line.norm.rotate90CW().multiply(delta);
        pt = prj.translate(v_trans);
        ip.push(pt);
    }
    return ip;
}

export function intersectLine2Box(line, box) {
    let ips = [];
    for (let seg of box.toSegments()) {
        let ips_tmp = intersectSegment2Line(seg, line);
        for (let pt of ips_tmp) {
            if (!ptInIntPoints(pt, ips)) {
                ips.push(pt);
            }
        }
    }
    return ips;
}

export function intersectLine2Arc(line, arc) {
    let ip = [];

    if (intersectLine2Box(line, arc.box).length === 0) {
        return ip;
    }

    let circle = new Flatten.Circle(arc.pc, arc.r);
    let ip_tmp = intersectLine2Circle(line, circle);
    for (let pt of ip_tmp) {
        if (pt.on(arc)) {
            ip.push(pt);
        }
    }

    return ip;
}

export function intersectSegment2Line(seg, line) {
    let ip = [];

    // Boundary cases
    if (seg.ps.on(line)) {
        ip.push(seg.ps);
    }
    // If both ends lay on line, return two intersection points
    if (seg.pe.on(line) && !seg.isZeroLength()) {
        ip.push(seg.pe);
    }

    if (ip.length > 0) {
        return ip;          // done, intersection found
    }

    // If zero-length segment and nothing found, return no intersections
    if (seg.isZeroLength()) {
        return ip;
    }

    // Not a boundary case, check if both points are on the same side and
    // hence there is no intersection
    if (seg.ps.leftTo(line) && seg.pe.leftTo(line) ||
        !seg.ps.leftTo(line) && !seg.pe.leftTo(line)) {
        return ip;
    }

    // Calculate intersection between lines
    let line1 = new Flatten.Line(seg.ps, seg.pe);
    return intersectLine2Line(line1, line);
}

export function intersectSegment2Segment(seg1, seg2) {
    let ip = [];

    // Special case of seg1 zero length
    if (seg1.isZeroLength()) {
        if (seg1.ps.on(seg2)) {
            ip.push(seg1.ps);
        }
        return ip;
    }

    // Special case of seg2 zero length
    if (seg2.isZeroLength()) {
        if (seg2.ps.on(seg1)) {
            ip.push(seg2.ps);
        }
        return ip;
    }

    // Neither seg1 nor seg2 is zero length
    let line1 = new Flatten.Line(seg1.ps, seg1.pe);
    let line2 = new Flatten.Line(seg2.ps, seg2.pe);

    // Check overlapping between segments in case of incidence.
    // If segments touching, add one point. If overlapping, add two points
    if (line1.incidentTo(line2)) {
        if (seg1.ps.on(seg2)) {
            ip.push(seg1.ps);
        }
        if (seg1.pe.on(seg2)) {
            ip.push(seg1.pe);
        }
        if (seg2.ps.on(seg1) && !seg2.ps.equalTo(seg1.ps) && !seg2.ps.equalTo(seg1.pe)) {
            ip.push(seg2.ps);
        }
        if (seg2.pe.on(seg1) && !seg2.pe.equalTo(seg1.ps) && !seg2.pe.equalTo(seg1.pe)) {
            ip.push(seg2.pe);
        }
    } else if (line1.parallelTo(line2)) {
        const r = new Flatten.Vector(seg1.ps, seg1.pe);
        const s = new Flatten.Vector(seg2.ps, seg2.pe);
        const q_p = new Flatten.Vector(seg1.ps, seg2.ps);
        const r_cross_s = r.cross(s);

        if (!Flatten.Utils.EQ_0(r_cross_s)) {
            const t = q_p.cross(s) / r_cross_s;
            const u = q_p.cross(r) / r_cross_s;

            if (Flatten.Utils.GE(t, 0) && Flatten.Utils.LE(t, 1) &&
                Flatten.Utils.GE(u, 0) && Flatten.Utils.LE(u, 1)) {
                ip.push(snapToSegmentEndpoints(seg1.ps.translate(r.multiply(t)), seg1, seg2));
            }
        }
    } else {                /* not incident and not parallel - potential intersection */
        // Calculate intersection between lines
        let new_ip = intersectLine2Line(line1, line2);
        if (new_ip.length > 0) {
            if (isPointInSegmentBox(new_ip[0], seg1) && isPointInSegmentBox(new_ip[0], seg2)) {
                ip.push(snapToSegmentEndpoints(new_ip[0], seg1, seg2));
            }
        }
    }
    return ip;
}

function snapToSegmentEndpoints(pt, seg1, seg2) {
    for (const endpoint of [seg1.ps, seg1.pe, seg2.ps, seg2.pe]) {
        if (pt.equalTo(endpoint)) {
            return endpoint;
        }
    }
    return pt;
}

function isPointInSegmentBox(point, segment) {
    const box = segment.box;
    return Flatten.Utils.LE(point.x, box.xmax) && Flatten.Utils.GE(point.x, box.xmin) &&
        Flatten.Utils.LE(point.y, box.ymax) && Flatten.Utils.GE(point.y, box.ymin)
}

export function intersectSegment2Circle(segment, circle) {
    let ips = [];

    // Special case of zero length segment
    if (segment.isZeroLength()) {
        let [dist, _] = segment.ps.distanceTo(circle.pc);
        if (Flatten.Utils.EQ(dist, circle.r)) {
            ips.push(segment.ps);
        }
        return ips;
    }

    // Non zero-length segment
    let line = new Flatten.Line(segment.ps, segment.pe);

    let ips_tmp = intersectLine2Circle(line, circle);

    for (let ip of ips_tmp) {
        if (ip.on(segment)) {
            ips.push(ip);
        }
    }

    return ips;
}

export function intersectSegment2Arc(segment, arc) {
    let ip = [];

    // Special case of zero-length segment
    if (segment.isZeroLength()) {
        if (segment.ps.on(arc)) {
            ip.push(segment.ps);
        }
        return ip;
    }

    // Non-zero length segment
    let line = new Flatten.Line(segment.ps, segment.pe);
    let circle = new Flatten.Circle(arc.pc, arc.r);

    let ip_tmp = intersectLine2Circle(line, circle);

    for (let pt of ip_tmp) {
        if (pt.on(segment) && pt.on(arc)) {
            ip.push(pt);
        }
    }
    return ip;

}

export function intersectSegment2Box(segment, box) {
    let ips = [];
    for (let seg of box.toSegments()) {
        let ips_tmp = intersectSegment2Segment(seg, segment);
        for (let ip of ips_tmp) {
            ips.push(ip);
        }
    }
    return ips;
}

export function intersectCircle2Circle(circle1, circle2) {
    let ip = [];

    let vec = new Flatten.Vector(circle1.pc, circle2.pc);

    let r1 = circle1.r;
    let r2 = circle2.r;

    // Degenerated circle
    if (Flatten.Utils.EQ_0(r1) || Flatten.Utils.EQ_0(r2))
        return ip;

    // In case of equal circles return one leftmost point
    if (Flatten.Utils.EQ_0(vec.x) && Flatten.Utils.EQ_0(vec.y) && Flatten.Utils.EQ(r1, r2)) {
        ip.push(circle1.pc.translate(-r1, 0));
        return ip;
    }

    let dist = circle1.pc.distanceTo(circle2.pc)[0];

    if (Flatten.Utils.GT(dist, r1 + r2))               // circles too far, no intersections
        return ip;

    if (Flatten.Utils.LT(dist, Math.abs(r1 - r2)))     // one circle is contained within another, no intersections
        return ip;

    // Normalize vector.
    vec.x /= dist;
    vec.y /= dist;

    let pt;

    // Case of touching from outside or from inside - single intersection point
    // TODO: check this specifically not sure if correct
    if (Flatten.Utils.EQ(dist, r1 + r2) || Flatten.Utils.EQ(dist, Math.abs(r1 - r2))) {
        pt = circle1.pc.translate(r1 * vec.x, r1 * vec.y);
        ip.push(pt);
        return ip;
    }

    // Case of two intersection points

    // Distance from first center to center of common chord:
    //   a = (r1^2 - r2^2 + d^2) / 2d
    // Separate for better accuracy
    let a = (r1 * r1) / (2 * dist) - (r2 * r2) / (2 * dist) + dist / 2;

    let mid_pt = circle1.pc.translate(a * vec.x, a * vec.y);
    let h = Math.sqrt(r1 * r1 - a * a);
    // let norm;

    // norm = vec.rotate90CCW().multiply(h);
    pt = mid_pt.translate(vec.rotate90CCW().multiply(h));
    ip.push(pt);

    // norm = vec.rotate90CW();
    pt = mid_pt.translate(vec.rotate90CW().multiply(h));
    ip.push(pt);

    return ip;
}

export function intersectCircle2Box(circle, box) {
    let ips = [];
    for (let seg of box.toSegments()) {
        let ips_tmp = intersectSegment2Circle(seg, circle);
        for (let ip of ips_tmp) {
            ips.push(ip);
        }
    }
    return ips;
}

export function intersectArc2Arc(arc1, arc2) {
    let ip = [];

    // Special case: overlapping arcs
    // May return up to 4 intersection points
    if (arc1.pc.equalTo(arc2.pc) && Flatten.Utils.EQ(arc1.r, arc2.r)) {
        let pt;

        pt = arc1.start;
        if (pt.on(arc2))
            ip.push(pt);

        pt = arc1.end;
        if (pt.on(arc2))
            ip.push(pt);

        pt = arc2.start;
        if (pt.on(arc1)) ip.push(pt);

        pt = arc2.end;
        if (pt.on(arc1)) ip.push(pt);

        return ip;
    }

    // Common case
    let circle1 = new Flatten.Circle(arc1.pc, arc1.r);
    let circle2 = new Flatten.Circle(arc2.pc, arc2.r);
    let ip_tmp = circle1.intersect(circle2);
    for (let pt of ip_tmp) {
        if (pt.on(arc1) && pt.on(arc2)) {
            ip.push(pt);
        }
    }
    return ip;
}

export function intersectArc2Circle(arc, circle) {
    let ip = [];

    // Case when arc center incident to circle center
    // Return arc's end points as 2 intersection points
    if (circle.pc.equalTo(arc.pc) && Flatten.Utils.EQ(circle.r, arc.r)) {
        ip.push(arc.start);
        ip.push(arc.end);
        return ip;
    }

    // Common case
    let circle1 = circle;
    let circle2 = new Flatten.Circle(arc.pc, arc.r);
    let ip_tmp = intersectCircle2Circle(circle1, circle2);
    for (let pt of ip_tmp) {
        if (pt.on(arc)) {
            ip.push(pt);
        }
    }
    return ip;
}

export function intersectArc2Box(arc, box) {
    let ips = [];
    for (let seg of box.toSegments()) {
        let ips_tmp = intersectSegment2Arc(seg, arc);
        for (let ip of ips_tmp) {
            ips.push(ip);
        }
    }
    return ips;
}

export function intersectEdge2Segment(edge, segment) {
    if (edge.isSegment) return intersectSegment2Segment(edge.shape, segment);
    if (edge.isArc) return intersectSegment2Arc(segment, edge.shape);
    return edge.shape.intersect(segment);
}

export function intersectEdge2Arc(edge, arc) {
    if (edge.isSegment) return intersectSegment2Arc(edge.shape, arc);
    if (edge.isArc) return intersectArc2Arc(edge.shape, arc);
    return edge.shape.intersect(arc);
}

export function intersectEdge2Line(edge, line) {
    if (edge.isSegment) return intersectSegment2Line(edge.shape, line);
    if (edge.isArc) return intersectLine2Arc(line, edge.shape);
    return edge.shape.intersect(line);
}

export function intersectEdge2Ray(edge, ray) {
    if (edge.isSegment) return intersectRay2Segment(ray, edge.shape);
    if (edge.isArc) return intersectRay2Arc(ray, edge.shape);
    return edge.shape.intersect(ray);
}

export function intersectEdge2Circle(edge, circle) {
    if (edge.isSegment) return intersectSegment2Circle(edge.shape, circle);
    if (edge.isArc) return intersectArc2Circle(edge.shape, circle);
    return edge.shape.intersect(circle);
}

export function intersectEdge2Ellipse(edge, ellipse) {
    if (edge.isSegment) return intersectSegment2Ellipse(edge.shape, ellipse);
    if (edge.isArc) return intersectArc2Ellipse(edge.shape, ellipse);
    if (edge.isEllipticArc) return intersectEllipticArc2Ellipse(edge.shape, ellipse);
    return edge.shape.intersect(ellipse);
}

export function intersectEdge2EllipticArc(edge, ellipticArc) {
    if (edge.isSegment) return intersectSegment2EllipticArc(edge.shape, ellipticArc);
    if (edge.isArc) return intersectArc2EllipticArc(edge.shape, ellipticArc);
    if (edge.isEllipticArc) return intersectEllipticArc2EllipticArc(edge.shape, ellipticArc);
    return edge.shape.intersect(ellipticArc);
}

export function intersectSegment2Polygon(segment, polygon) {
    let ip = [];

    for (let edge of polygon.edges) {
        for (let pt of intersectEdge2Segment(edge, segment)) {
            ip.push(pt);
        }
    }

    return ip;
}

export function intersectArc2Polygon(arc, polygon) {
    let ip = [];

    for (let edge of polygon.edges) {
        for (let pt of intersectEdge2Arc(edge, arc)) {
            ip.push(pt);
        }
    }

    return ip;
}

export function intersectLine2Polygon(line, polygon) {
    let ip = [];

    if (polygon.isEmpty()) {
        return ip;
    }

    for (let edge of polygon.edges) {
        for (let pt of intersectEdge2Line(edge, line)) {
            if (!ptInIntPoints(pt, ip)) {
                ip.push(pt);
            }
        }
    }

    return line.sortPoints(ip);
}

export function intersectCircle2Polygon(circle, polygon) {
    let ip = [];

    if (polygon.isEmpty()) {
        return ip;
    }

    for (let edge of polygon.edges) {
        for (let pt of intersectEdge2Circle(edge, circle)) {
            ip.push(pt);
        }
    }

    return ip;
}

export function intersectEdge2Edge(edge1, edge2) {
    if (edge1.isSegment) {
        return intersectEdge2Segment(edge2, edge1.shape)
    }
    else if (edge1.isArc) {
        return intersectEdge2Arc(edge2, edge1.shape)
    }
    else if (edge1.isEllipticArc) {
        return intersectEdge2EllipticArc(edge2, edge1.shape)
    }
    else if (edge1.isLine) {
        return intersectEdge2Line(edge2, edge1.shape)
    }
    else if (edge1.isRay) {
        return intersectEdge2Ray(edge2, edge1.shape)
    }
    return []
}

export function intersectEdge2Polygon(edge, polygon) {
    let ip = [];

    if (polygon.isEmpty() || edge.shape.box.not_intersect(polygon.box)) {
        return ip;
    }

    let resp_edges = polygon.edges.search(edge.shape.box);

    for (let resp_edge of resp_edges) {
        ip = [...ip, ...intersectEdge2Edge(edge, resp_edge)]
    }

    return ip;
}

export function intersectMultiline2Polygon(multiline, polygon) {
    let ip = [];

    if (polygon.isEmpty() || multiline.size === 0) {
        return ip;
    }

    for (let edge of multiline) {
        ip = [...ip, ...intersectEdge2Polygon(edge, polygon)];
    }

    return ip;
}

export function intersectPolygon2Polygon(polygon1, polygon2) {
    let ip = [];

    if (polygon1.isEmpty() || polygon2.isEmpty()) {
        return ip;
    }

    if (polygon1.box.not_intersect(polygon2.box)) {
        return ip;
    }

    for (let edge1 of polygon1.edges) {
        ip = [...ip, ...intersectEdge2Polygon(edge1, polygon2)]
    }

    return ip;
}

export function intersectBox2Box(box1, box2) {
    let ip = [];
    for (let segment1 of box1.toSegments()) {
        for (let segment2 of box2.toSegments()) {
            for (let pt of intersectSegment2Segment(segment1, segment2)) {
                ip.push(pt)
            }
        }
    }
    return ip;
}

export function intersectShape2Polygon(shape, polygon) {
    if (shape instanceof Flatten.Line) {
        return intersectLine2Polygon(shape, polygon);
    }
    else if (shape instanceof Flatten.Segment) {
        return intersectSegment2Polygon(shape, polygon);
    }
    else if (shape instanceof Flatten.Arc) {
        return intersectArc2Polygon(shape, polygon);
    }
    else if (shape instanceof Flatten.EllipticArc) {
        return intersectEllipticArc2Polygon(shape, polygon);
    }
    else if (shape instanceof Flatten.Ellipse) {
        return intersectEllipse2Polygon(shape, polygon);
    }
    else {
        return [];
    }
}

function ptInIntPoints(new_pt, ip) {
    return ip.some( pt => pt.equalTo(new_pt) )
}

function createLineFromRay(ray) {
    return new Flatten.Line(ray.start, ray.norm)
}
export function intersectRay2Segment(ray, segment) {
    return intersectSegment2Line(segment, createLineFromRay(ray))
        .filter(pt => ray.contains(pt));
}

export function intersectRay2Arc(ray, arc) {
    return intersectLine2Arc(createLineFromRay(ray), arc)
        .filter(pt => ray.contains(pt))
}

export function intersectRay2Circle(ray, circle) {
    return intersectLine2Circle(createLineFromRay(ray), circle)
        .filter(pt => ray.contains(pt))
}

export function intersectRay2Box(ray, box) {
    return intersectLine2Box(createLineFromRay(ray), box)
        .filter(pt => ray.contains(pt))
}

export function intersectRay2Line(ray, line) {
    return intersectLine2Line(createLineFromRay(ray), line)
        .filter(pt => ray.contains(pt))
}

export function intersectRay2Ray(ray1, ray2) {
    return intersectLine2Line(createLineFromRay(ray1), createLineFromRay(ray2))
        .filter(pt => ray1.contains(pt))
        .filter(pt => ray2.contains(pt))
}

export function intersectRay2Polygon(ray, polygon) {
    return intersectLine2Polygon(createLineFromRay(ray), polygon)
        .filter(pt => ray.contains(pt))
}

export function intersectShape2Shape(shape1, shape2) {
    if (shape1.intersect && shape1.intersect instanceof Function) {
        return shape1.intersect(shape2)
    }
    throw Errors.UNSUPPORTED_SHAPE_TYPE
}

export function intersectShape2Multiline(shape, multiline) {
    let ip = [];
    for (let edge of multiline) {
        ip = [...ip, ...intersectShape2Shape(shape, edge.shape)];
    }
    return ip;
}

export function intersectMultiline2Multiline(multiline1, multiline2) {
    let ip = [];
    for (let edge1 of multiline1) {
        for (let edge2 of multiline2) {
            ip = [...ip, ...intersectShape2Shape(edge1.shape, edge2.shape)];
        }
    }
    return ip;
}

export function intersectLine2Ellipse(line, ellipse) {
    let ip = [];

    // Degenerated ellipse
    if (Flatten.Utils.EQ_0(ellipse.rx) || Flatten.Utils.EQ_0(ellipse.ry)) {
        return ip;
    }

    // Map line to the frame where ellipse is a unit circle, intersect and map points back
    let to_unit = ellipse.toUnitMatrix();
    let from_unit = ellipse.fromUnitMatrix();
    let pt1 = line.pt.transform(to_unit);
    let pt2 = line.pt.translate(line.norm.rotate90CCW()).transform(to_unit);
    let unit_line = new Flatten.Line(pt1, pt2);
    let unit_circle = new Flatten.Circle(new Flatten.Point(0, 0), 1);

    for (let pt of intersectLine2Circle(unit_line, unit_circle)) {
        ip.push(pt.transform(from_unit));
    }
    return ip;
}

export function intersectRay2Ellipse(ray, ellipse) {
    return intersectLine2Ellipse(createLineFromRay(ray), ellipse)
        .filter(pt => ray.contains(pt))
}

export function intersectSegment2Ellipse(segment, ellipse) {
    let ips = [];

    // Special case of zero length segment
    if (segment.isZeroLength()) {
        if (pointOnEllipse(segment.ps, ellipse)) {
            ips.push(segment.ps);
        }
        return ips;
    }

    // Non zero-length segment
    let line = new Flatten.Line(segment.ps, segment.pe);

    for (let ip of intersectLine2Ellipse(line, ellipse)) {
        if (ip.on(segment)) {
            ips.push(ip);
        }
    }

    return ips;
}

export function intersectEllipse2Box(ellipse, box) {
    let ips = [];
    for (let seg of box.toSegments()) {
        for (let ip of intersectSegment2Ellipse(seg, ellipse)) {
            if (!ptInIntPoints(ip, ips)) {
                ips.push(ip);
            }
        }
    }
    return ips;
}

export function intersectEllipse2Circle(ellipse, circle) {
    let ip = [];

    // Degenerated ellipse or circle
    if (Flatten.Utils.EQ_0(ellipse.rx) || Flatten.Utils.EQ_0(ellipse.ry) || Flatten.Utils.EQ_0(circle.r)) {
        return ip;
    }

    if (ellipse.box.not_intersect(circle.box)) {
        return ip;
    }

    // In case of equal shapes return one leftmost point
    if (ellipseIsCircle(ellipse, circle)) {
        ip.push(circle.pc.translate(-circle.r, 0));
        return ip;
    }

    let {pc, r} = circle;
    return intersectEllipse2Implicit(ellipse,
        (pt) => (pt.x - pc.x) * (pt.x - pc.x) + (pt.y - pc.y) * (pt.y - pc.y) - r * r,
        (pt) => Flatten.Utils.EQ(pt.distanceTo(pc)[0], r)
    );
}

export function intersectEllipse2Ellipse(ellipse1, ellipse2) {
    let ip = [];

    // Degenerated ellipses
    if (Flatten.Utils.EQ_0(ellipse1.rx) || Flatten.Utils.EQ_0(ellipse1.ry) ||
        Flatten.Utils.EQ_0(ellipse2.rx) || Flatten.Utils.EQ_0(ellipse2.ry)) {
        return ip;
    }

    if (ellipse1.box.not_intersect(ellipse2.box)) {
        return ip;
    }

    // In case of equal ellipses return one leftmost point
    if (equalEllipses(ellipse1, ellipse2)) {
        let box = ellipse1.box;
        let [t1, t2] = ellipseLeftRightParams(ellipse1);
        let pt1 = ellipse1.pointAt(t1);
        let pt2 = ellipse1.pointAt(t2);
        ip.push(Flatten.Utils.LE(pt1.x, box.xmin) ? pt1 : pt2);
        return ip;
    }

    let cos = Math.cos(ellipse2.angle);
    let sin = Math.sin(ellipse2.angle);
    let {pc, rx, ry} = ellipse2;
    return intersectEllipse2Implicit(ellipse1,
        (pt) => {
            let dx = pt.x - pc.x;
            let dy = pt.y - pc.y;
            let u = (cos * dx + sin * dy) / rx;
            let v = (-sin * dx + cos * dy) / ry;
            return u * u + v * v - 1;
        },
        (pt) => pointOnEllipse(pt, ellipse2)
    );
}

export function intersectArc2Ellipse(arc, ellipse) {
    let ip = [];

    // Case when arc lies on the ellipse
    // Return arc's end points as 2 intersection points
    let circle = new Flatten.Circle(arc.pc, arc.r);
    if (ellipseIsCircle(ellipse, circle)) {
        ip.push(arc.start);
        ip.push(arc.end);
        return ip;
    }

    // Common case
    for (let pt of intersectEllipse2Circle(ellipse, circle)) {
        if (pt.on(arc)) {
            ip.push(pt);
        }
    }
    return ip;
}

export function intersectEllipse2Polygon(ellipse, polygon) {
    let ip = [];

    if (polygon.isEmpty()) {
        return ip;
    }

    for (let edge of polygon.edges) {
        for (let pt of intersectEdge2Ellipse(edge, ellipse)) {
            ip.push(pt);
        }
    }

    return ip;
}

export function intersectLine2EllipticArc(line, ellipticArc) {
    if (intersectLine2Box(line, ellipticArc.box).length === 0) {
        return [];
    }
    return intersectLine2Ellipse(line, ellipticArc.ellipse)
        .filter(pt => pt.on(ellipticArc));
}

export function intersectRay2EllipticArc(ray, ellipticArc) {
    return intersectLine2EllipticArc(createLineFromRay(ray), ellipticArc)
        .filter(pt => ray.contains(pt));
}

export function intersectSegment2EllipticArc(segment, ellipticArc) {
    // Special case of zero-length segment
    if (segment.isZeroLength()) {
        return segment.ps.on(ellipticArc) ? [segment.ps] : [];
    }

    return intersectSegment2Ellipse(segment, ellipticArc.ellipse)
        .filter(pt => pt.on(ellipticArc));
}

export function intersectEllipticArc2Circle(ellipticArc, circle) {
    // Case when elliptic arc lies on the circle
    // Return arc's end points as 2 intersection points
    if (ellipseIsCircle(ellipticArc.ellipse, circle)) {
        return [ellipticArc.start, ellipticArc.end];
    }

    return intersectEllipse2Circle(ellipticArc.ellipse, circle)
        .filter(pt => pt.on(ellipticArc));
}

export function intersectEllipticArc2Ellipse(ellipticArc, ellipse) {
    // Case when elliptic arc lies on the ellipse
    // Return arc's end points as 2 intersection points
    if (equalEllipses(ellipticArc.ellipse, ellipse)) {
        return [ellipticArc.start, ellipticArc.end];
    }

    return intersectEllipse2Ellipse(ellipticArc.ellipse, ellipse)
        .filter(pt => pt.on(ellipticArc));
}

export function intersectArc2EllipticArc(arc, ellipticArc) {
    let circle = new Flatten.Circle(arc.pc, arc.r);

    // Special case: overlapping arcs
    if (ellipseIsCircle(ellipticArc.ellipse, circle)) {
        return overlappingArcsEndPoints(arc, ellipticArc);
    }

    return intersectEllipse2Circle(ellipticArc.ellipse, circle)
        .filter(pt => pt.on(arc) && pt.on(ellipticArc));
}

export function intersectEllipticArc2EllipticArc(ellipticArc1, ellipticArc2) {
    let ellipse1 = ellipticArc1.ellipse;
    let ellipse2 = ellipticArc2.ellipse;

    // Special case: overlapping arcs
    if (equalEllipses(ellipse1, ellipse2)) {
        return overlappingArcsEndPoints(ellipticArc1, ellipticArc2);
    }

    return intersectEllipse2Ellipse(ellipse1, ellipse2)
        .filter(pt => pt.on(ellipticArc1) && pt.on(ellipticArc2));
}

export function intersectEllipticArc2Box(ellipticArc, box) {
    let ips = [];
    for (let seg of box.toSegments()) {
        for (let ip of intersectSegment2EllipticArc(seg, ellipticArc)) {
            ips.push(ip);
        }
    }
    return ips;
}

export function intersectEllipticArc2Polygon(ellipticArc, polygon) {
    let ip = [];

    for (let edge of polygon.edges) {
        for (let pt of intersectEdge2EllipticArc(edge, ellipticArc)) {
            ip.push(pt);
        }
    }

    return ip;
}

/**
 * Return end points of the arc that lie on the other arc. Both arcs lie on the same curve.
 * May return up to 4 points
 */
function overlappingArcsEndPoints(arc1, arc2) {
    let ip = [];
    for (let pt of [arc1.start, arc1.end]) {
        if (pt.on(arc2) && !ptInIntPoints(pt, ip)) ip.push(pt);
    }
    for (let pt of [arc2.start, arc2.end]) {
        if (pt.on(arc1) && !ptInIntPoints(pt, ip)) ip.push(pt);
    }
    return ip;
}

function pointOnEllipse(pt, ellipse) {
    return Flatten.Utils.EQ_0(Flatten.Distance.point2ellipse(pt, ellipse)[0]);
}

function ellipseIsCircle(ellipse, circle) {
    return ellipse.pc.equalTo(circle.pc) &&
        Flatten.Utils.EQ(ellipse.rx, circle.r) &&
        Flatten.Utils.EQ(ellipse.ry, circle.r);
}

function anglesEqualModPI(angle1, angle2) {
    let diff = (angle1 - angle2) % Math.PI;
    if (diff < 0) diff += Math.PI;
    return Flatten.Utils.EQ_0(diff) || Flatten.Utils.EQ(diff, Math.PI);
}

function equalEllipses(ellipse1, ellipse2) {
    if (!ellipse1.pc.equalTo(ellipse2.pc)) {
        return false;
    }
    let {EQ} = Flatten.Utils;
    if (EQ(ellipse1.rx, ellipse2.rx) && EQ(ellipse1.ry, ellipse2.ry)) {
        return EQ(ellipse1.rx, ellipse1.ry) || anglesEqualModPI(ellipse1.angle, ellipse2.angle);
    }
    if (EQ(ellipse1.rx, ellipse2.ry) && EQ(ellipse1.ry, ellipse2.rx)) {
        return anglesEqualModPI(ellipse1.angle, ellipse2.angle + Math.PI / 2);
    }
    return false;
}

function ellipseLeftRightParams(ellipse) {
    let cos = Math.cos(ellipse.angle);
    let sin = Math.sin(ellipse.angle);
    let t = Math.atan2(-ellipse.ry * sin, ellipse.rx * cos);
    return [t, t + Math.PI];
}

const ELLIPSE_SAMPLES = 360;
const GOLDEN_RATIO = (Math.sqrt(5) - 1) / 2;

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

function bisectRoot(f, a, b) {
    let fa = f(a);
    for (let i = 0; i < 200; i++) {
        let m = (a + b) / 2;
        if (m <= a || m >= b) break;
        let fm = f(m);
        if (fm === 0) return m;
        if ((fm > 0) === (fa > 0)) {
            a = m;
            fa = fm;
        } else {
            b = m;
        }
    }
    return (a + b) / 2;
}

/**
 * Find intersection points of the ellipse with the curve defined by implicit function f(pt) = 0.
 * Parameter of the ellipse is sampled, roots are found by bisection where f changes sign.
 * Local minimums of |f| without change of sign are refined by golden section search
 * to find touching points and pairs of close roots.
 * @param {Ellipse} ellipse
 * @param {function} f - implicit function of the other curve
 * @param {function} isOn - returns true if point belongs to the other curve
 * @returns {Point[]}
 */
function intersectEllipse2Implicit(ellipse, f, isOn) {
    const N = ELLIPSE_SAMPLES;
    const step = Flatten.PIx2 / N;
    let g = (t) => f(ellipse.pointAt(t));
    let fs = [];
    for (let i = 0; i < N; i++) {
        fs.push(g(i * step));
    }

    let ip = [];
    let add = (t) => {
        let pt = ellipse.pointAt(t);
        if (!ptInIntPoints(pt, ip)) {
            ip.push(pt);
        }
    };

    for (let i = 0; i < N; i++) {
        let f_cur = fs[i];
        let f_next = fs[(i + 1) % N];
        if (f_cur === 0) {
            add(i * step);
        } else if (f_cur * f_next < 0) {
            add(bisectRoot(g, i * step, (i + 1) * step));
        }
    }

    for (let i = 0; i < N; i++) {
        let f_prev = fs[(i - 1 + N) % N];
        let f_cur = fs[i];
        let f_next = fs[(i + 1) % N];
        if (f_cur === 0 || f_prev * f_cur <= 0 || f_cur * f_next <= 0) continue;
        if (Math.abs(f_cur) > Math.abs(f_prev) || Math.abs(f_cur) > Math.abs(f_next)) continue;

        let sign = f_cur > 0 ? 1 : -1;
        let a = (i - 1) * step;
        let b = (i + 1) * step;
        let t_min = goldenSectionMin((t) => sign * g(t), a, b);
        if (sign * g(t_min) < 0) {
            // two close roots between samples
            add(bisectRoot(g, a, t_min));
            add(bisectRoot(g, t_min, b));
        } else if (isOn(ellipse.pointAt(t_min))) {
            // touching point
            add(t_min);
        }
    }

    return ip;
}
