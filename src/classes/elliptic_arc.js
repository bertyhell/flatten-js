"use strict";

import Flatten from '../flatten';
import * as Intersection from '../algorithms/intersection';
import {convertToString} from "../utils/attributes";
import {Shape} from "./shape";
import {
    ellipsePointAt,
    ellipseToUnit,
    ellipseExtremeParams,
    ellipseTransformAxes
} from "./ellipse";

/**
 * Class representing an elliptic arc. <br/>
 * Elliptic arc is a part of the ellipse (pc, rx, ry, angle) between start and end parametric angles: <br/>
 * pt(t) = pc + R(angle) * (rx * cos(t), ry * sin(t)) <br/>
 * Note that startAngle and endAngle are parametric angles, not polar angles of the points.
 * For a circle (rx == ry) and angle == 0 they are the same as angles of the circular arc.
 * @type {EllipticArc}
 */
export class EllipticArc extends Shape {
    /**
     *
     * @param {Point} pc - ellipse center
     * @param {number} rx - semi-axis along the (rotated) x-axis
     * @param {number} ry - semi-axis along the (rotated) y-axis
     * @param {number} angle - rotation angle of the ellipse in radians
     * @param {number} startAngle - start parametric angle in radians
     * @param {number} endAngle - end parametric angle in radians
     * @param {boolean} counterClockwise - arc direction, true - counterclockwise, false - clockwise
     */
    constructor(...args) {
        super()
        /**
         * Ellipse center
         * @type {Point}
         */
        this.pc = new Flatten.Point();
        /**
         * Semi-axis along the (rotated) x-axis
         * @type {number}
         */
        this.rx = 1;
        /**
         * Semi-axis along the (rotated) y-axis
         * @type {number}
         */
        this.ry = 1;
        /**
         * Rotation angle of the ellipse in radians
         * @type {number}
         */
        this.angle = 0;
        /**
         * Start parametric angle in radians
         * @type {number}
         */
        this.startAngle = 0;
        /**
         * End parametric angle in radians
         * @type {number}
         */
        this.endAngle = 2 * Math.PI;
        /**
         * Arc orientation
         * @type {boolean}
         */
        this.counterClockwise = true;

        if (args.length === 0)
            return;

        if (args.length === 1 && args[0] instanceof Object && args[0].name === "ellipticArc") {
            let {pc, rx, ry, angle, startAngle, endAngle, counterClockwise} = args[0];
            this.pc = new Flatten.Point(pc.x, pc.y);
            this.rx = rx;
            this.ry = ry;
            this.angle = angle || 0;
            this.startAngle = startAngle;
            this.endAngle = endAngle;
            this.counterClockwise = counterClockwise;
        } else {
            let [pc, rx, ry, angle, startAngle, endAngle, counterClockwise] = [...args];
            if (pc && pc instanceof Flatten.Point) this.pc = pc.clone();
            if (rx !== undefined) this.rx = rx;
            if (ry !== undefined) this.ry = ry;
            if (angle !== undefined) this.angle = angle;
            if (startAngle !== undefined) this.startAngle = startAngle;
            if (endAngle !== undefined) this.endAngle = endAngle;
            if (counterClockwise !== undefined) this.counterClockwise = counterClockwise;
        }
    }

    /**
     * Return new cloned instance of elliptic arc
     * @returns {EllipticArc}
     */
    clone() {
        return new Flatten.EllipticArc(this.pc.clone(), this.rx, this.ry, this.angle,
            this.startAngle, this.endAngle, this.counterClockwise);
    }

    /**
     * Return supporting ellipse
     * @returns {Ellipse}
     */
    get ellipse() {
        return new Flatten.Ellipse(this.pc, this.rx, this.ry, this.angle);
    }

    /**
     * Get sweep (parametric) angle in radians. Sweep angle is non-negative number from 0 to 2*PI
     * @returns {number}
     */
    get sweep() {
        let startAngle = this.startAngle;
        let endAngle = this.endAngle;

        // check full ellipse
        if (Flatten.Utils.EQ(Math.abs(startAngle - endAngle), Flatten.PIx2)) {
            return Flatten.PIx2;
        }

        startAngle = normalizeAngle(startAngle);
        endAngle = normalizeAngle(endAngle);

        let sweep = this.counterClockwise ? endAngle - startAngle : startAngle - endAngle;
        if (sweep < 0) {
            sweep += Flatten.PIx2;
        }
        return sweep
    }

    /**
     * Get start point of elliptic arc
     * @returns {Point}
     */
    get start() {
        return this.pointAt(this.startAngle);
    }

    /**
     * Get end point of elliptic arc
     * @returns {Point}
     */
    get end() {
        return this.pointAt(this.endAngle);
    }

    /**
     * Get center of elliptic arc
     * @returns {Point}
     */
    get center() {
        return this.pc.clone();
    }

    get vertices() {
        return [this.start.clone(), this.end.clone()];
    }

    /**
     * Get length of elliptic arc. Calculated by numeric integration
     * @returns {number}
     */
    get length() {
        let sweep = this.sweep;
        let t0 = this.counterClockwise ? this.startAngle : this.startAngle - sweep;
        return ellipseArcLength(this.rx, this.ry, t0, t0 + sweep);
    }

    /**
     * Get bounding box of the elliptic arc
     * @returns {Box}
     */
    get box() {
        let sweep = this.sweep;
        let box = this.start.box.merge(this.end.box);
        for (let t of ellipseExtremeParams(this.rx, this.ry, this.angle)) {
            if (this.paramOffset(t) < sweep) {
                box = box.merge(this.pointAt(t).box);
            }
        }
        return box;
    }

    /**
     * Return point of the supporting ellipse at given parametric angle
     * @param {number} t - parametric angle in radians
     * @returns {Point}
     */
    pointAt(t) {
        return ellipsePointAt(this.pc, this.rx, this.ry, this.angle, t);
    }

    /**
     * Return parametric angle in range [0, 2*PI) of the point of supporting ellipse
     * @param {Point} pt
     * @returns {number}
     */
    paramOf(pt) {
        let [u, v] = ellipseToUnit(this.pc, this.rx, this.ry, this.angle, pt);
        return normalizeAngle(Math.atan2(v, u));
    }

    /**
     * Return parametric distance in range [0, 2*PI) from start angle to given parametric angle,
     * measured in the direction of the arc
     * @param {number} t - parametric angle
     * @returns {number}
     */
    paramOffset(t) {
        let offset = this.counterClockwise ? t - this.startAngle : this.startAngle - t;
        return normalizeAngle(offset);
    }

    /**
     * Returns true if elliptic arc contains point, false otherwise
     * @param {Point} pt - point to test
     * @returns {boolean}
     */
    contains(pt) {
        if (!Flatten.Utils.EQ_0(Flatten.Distance.point2ellipse(pt, this.ellipse)[0]))
            return false;

        if (pt.equalTo(this.start) || pt.equalTo(this.end))
            return true;

        return this.paramOffset(this.paramOf(pt)) <= this.sweep;
    }

    /**
     * When given point belongs to elliptic arc, return array of two elliptic arcs split by this point.
     * If point is incident to start or end point of the arc, return clone of the arc.
     * @param {Point} pt Query point
     * @returns {EllipticArc[]}
     */
    split(pt) {
        if (this.start.equalTo(pt))
            return [null, this.clone()];

        if (this.end.equalTo(pt))
            return [this.clone(), null];

        let offset = this.paramOffset(this.paramOf(pt));
        let t = this.counterClockwise ? this.startAngle + offset : this.startAngle - offset;

        return [
            new Flatten.EllipticArc(this.pc, this.rx, this.ry, this.angle, this.startAngle, t, this.counterClockwise),
            new Flatten.EllipticArc(this.pc, this.rx, this.ry, this.angle, t, this.endAngle, this.counterClockwise)
        ]
    }

    /**
     * Return middle point of the elliptic arc (point at the middle of the parametric sweep)
     * @returns {Point}
     */
    middle() {
        return this.pointAt(this.paramAtOffset(this.sweep / 2));
    }

    /**
     * Get point at given length
     * @param {number} length - The length along the elliptic arc
     * @returns {Point}
     */
    pointAtLength(length) {
        let total = this.length;
        if (length > total || length < 0) return null;
        if (length === 0) return this.start;
        if (length === total) return this.end;

        let sweep = this.sweep;
        let partial = (offset) => {
            let t1 = this.paramAtOffset(offset);
            return ellipseArcLength(this.rx, this.ry, Math.min(this.startAngle, t1), Math.max(this.startAngle, t1));
        };

        // Newton iterations safeguarded by bisection
        let lo = 0, hi = sweep;
        let offset = sweep * length / total;
        for (let i = 0; i < 50; i++) {
            let f = partial(offset) - length;
            if (Math.abs(f) < Flatten.DP_TOL * 1e-3) break;
            if (f > 0) hi = offset; else lo = offset;
            let speed = ellipseSpeed(this.rx, this.ry, this.paramAtOffset(offset));
            let next = speed > 0 ? offset - f / speed : (lo + hi) / 2;
            offset = (next > lo && next < hi) ? next : (lo + hi) / 2;
        }
        return this.pointAt(this.paramAtOffset(offset));
    }

    /**
     * Return parametric angle at given parametric distance from start in the direction of the arc
     * @param {number} offset
     * @returns {number}
     */
    paramAtOffset(offset) {
        return this.counterClockwise ? this.startAngle + offset : this.startAngle - offset;
    }

    /**
     * Returns array of intersection points between elliptic arc and other shape
     * @param {Shape} shape Shape of the one of supported types <br/>
     * @returns {Point[]}
     */
    intersect(shape) {
        if (shape instanceof Flatten.Point) {
            return this.contains(shape) ? [shape] : [];
        }
        if (shape instanceof Flatten.Line) {
            return Intersection.intersectLine2EllipticArc(shape, this);
        }
        if (shape instanceof Flatten.Ray) {
            return Intersection.intersectRay2EllipticArc(shape, this);
        }
        if (shape instanceof Flatten.Circle) {
            return Intersection.intersectEllipticArc2Circle(this, shape);
        }
        if (shape instanceof Flatten.Ellipse) {
            return Intersection.intersectEllipticArc2Ellipse(this, shape);
        }
        if (shape instanceof Flatten.Segment) {
            return Intersection.intersectSegment2EllipticArc(shape, this);
        }
        if (shape instanceof Flatten.Box) {
            return Intersection.intersectEllipticArc2Box(this, shape);
        }
        if (shape instanceof Flatten.Arc) {
            return Intersection.intersectArc2EllipticArc(shape, this);
        }
        if (shape instanceof Flatten.EllipticArc) {
            return Intersection.intersectEllipticArc2EllipticArc(this, shape);
        }
        if (shape instanceof Flatten.Polygon) {
            return Intersection.intersectEllipticArc2Polygon(this, shape);
        }
        if (shape instanceof Flatten.Multiline) {
            return Intersection.intersectShape2Multiline(this, shape);
        }
    }

    /**
     * Calculate distance and shortest segment from elliptic arc to shape and return array [distance, shortest segment]
     * @param {Shape} shape Shape of the one of supported types Point, Line, Circle, Ellipse, Segment, Arc,
     * EllipticArc, Box, Polygon, Multiline or Planar Set
     * @returns {number} distance from elliptic arc to shape
     * @returns {Segment} shortest segment between elliptic arc and shape (started at elliptic arc, ended at shape)
     */
    distanceTo(shape) {
        if (shape instanceof Flatten.Point) {
            let [dist, shortest_segment] = Flatten.Distance.point2ellipticArc(shape, this);
            shortest_segment = shortest_segment.reverse();
            return [dist, shortest_segment];
        }

        if (shape instanceof Flatten.Circle) {
            return Flatten.Distance.ellipticArc2circle(this, shape);
        }

        if (shape instanceof Flatten.Ellipse) {
            return Flatten.Distance.ellipticArc2ellipse(this, shape);
        }

        if (shape instanceof Flatten.Line) {
            return Flatten.Distance.ellipticArc2line(this, shape);
        }

        if (shape instanceof Flatten.Segment) {
            return Flatten.Distance.ellipticArc2segment(this, shape);
        }

        if (shape instanceof Flatten.Arc) {
            return Flatten.Distance.ellipticArc2arc(this, shape);
        }

        if (shape instanceof Flatten.EllipticArc) {
            return Flatten.Distance.ellipticArc2ellipticArc(this, shape);
        }

        if (shape instanceof Flatten.Box) {
            return Flatten.Distance.shape2polygon(this, new Flatten.Polygon(shape));
        }

        if (shape instanceof Flatten.Polygon) {
            return Flatten.Distance.shape2polygon(this, shape);
        }

        if (shape instanceof Flatten.PlanarSet) {
            return Flatten.Distance.shape2planarSet(this, shape);
        }

        if (shape instanceof Flatten.Multiline) {
            return Flatten.Distance.shape2multiline(this, shape);
        }
    }

    /**
     * Breaks elliptic arc in extreme points of x and y and returns array of sub-arcs
     * @returns {EllipticArc[]}
     */
    breakToFunctional() {
        let sweep = this.sweep;
        let offsets = ellipseExtremeParams(this.rx, this.ry, this.angle)
            .map(t => this.paramOffset(t))
            .filter(offset => Flatten.Utils.GT(offset, 0) && Flatten.Utils.LT(offset, sweep))
            .sort((a, b) => a - b);

        if (offsets.length === 0) {
            return [this];
        }

        let func_arcs_array = [];
        let prev = this.startAngle;
        for (let offset of offsets) {
            let next = this.paramAtOffset(offset);
            func_arcs_array.push(new Flatten.EllipticArc(this.pc, this.rx, this.ry, this.angle,
                prev, next, this.counterClockwise));
            prev = next;
        }
        func_arcs_array.push(new Flatten.EllipticArc(this.pc, this.rx, this.ry, this.angle,
            prev, this.paramAtOffset(sweep), this.counterClockwise));
        return func_arcs_array;
    }

    /**
     * Return tangent unit vector in the start point in the direction from start to end
     * @returns {Vector}
     */
    tangentInStart() {
        let vec = ellipseDerivative(this.rx, this.ry, this.angle, this.startAngle);
        return (this.counterClockwise ? vec : vec.invert()).normalize();
    }

    /**
     * Return tangent unit vector in the end point in the direction from end to start
     * @returns {Vector}
     */
    tangentInEnd() {
        let vec = ellipseDerivative(this.rx, this.ry, this.angle, this.endAngle);
        return (this.counterClockwise ? vec.invert() : vec).normalize();
    }

    /**
     * Returns new elliptic arc with swapped start and end angles and reversed direction
     * @returns {EllipticArc}
     */
    reverse() {
        return new Flatten.EllipticArc(this.pc, this.rx, this.ry, this.angle,
            this.endAngle, this.startAngle, !this.counterClockwise);
    }

    /**
     * Return new elliptic arc transformed using affine transformation matrix. <br/>
     * Any affine transformation is supported, including non-uniform scaling and skewing.
     * @param {Matrix} matrix - affine transformation matrix
     * @returns {EllipticArc}
     */
    transform(matrix = new Flatten.Matrix()) {
        let full = Flatten.Utils.EQ(this.sweep, Flatten.PIx2);
        let [rx, ry, angle] = ellipseTransformAxes(this.rx, this.ry, this.angle, matrix);
        let pc = this.pc.transform(matrix);
        let counterClockwise = this.counterClockwise;
        if (matrix.a * matrix.d - matrix.b * matrix.c < 0) {
            counterClockwise = !counterClockwise;
        }

        let result = new Flatten.EllipticArc(pc, rx, ry, angle, 0, 0, counterClockwise);
        let startAngle = result.paramOf(this.start.transform(matrix));
        let endAngle;
        if (full) {
            endAngle = counterClockwise ? startAngle + Flatten.PIx2 : startAngle - Flatten.PIx2;
        } else {
            endAngle = result.paramOf(this.end.transform(matrix));
        }
        result.startAngle = startAngle;
        result.endAngle = endAngle;
        return result;
    }

    /**
     * Calculate definite integral of the elliptic arc: integral of (y - ymin) dx along the arc
     * from start to end. Used to calculate area of the face
     * @param {number} ymin
     * @returns {number}
     */
    definiteIntegral(ymin = 0) {
        let t0 = this.startAngle;
        let t1 = this.paramAtOffset(this.sweep);
        let a = this.rx;
        let b = this.ry;
        let cos = Math.cos(this.angle);
        let sin = Math.sin(this.angle);
        let F = (t) => {
            let sin_t = Math.sin(t);
            return -(a * a + b * b) * sin * cos * sin_t * sin_t / 2
                - a * b * t / 2
                + a * b * (cos * cos - sin * sin) * Math.sin(2 * t) / 4;
        };
        let x0 = this.pointAt(t0).x;
        let x1 = this.pointAt(t1).x;
        return (this.pc.y - ymin) * (x1 - x0) + F(t1) - F(t0);
    }

    /**
     * Sort given array of points from elliptic arc start to end, assuming all points lay on the arc
     * @param {Point[]} pts array of points
     * @returns {Point[]} new array sorted
     */
    sortPoints(pts) {
        let offset = (pt) => pt.equalTo(this.start) ? 0 : this.paramOffset(this.paramOf(pt));
        return pts.slice().sort((pt1, pt2) => offset(pt1) - offset(pt2));
    }

    get name() {
        return "ellipticArc"
    }

    /**
     * Return string to draw elliptic arc in svg
     * @param {Object} attrs - an object with attributes of svg path element
     * @returns {string}
     */
    svg(attrs = {}) {
        if (Flatten.Utils.EQ(this.sweep, 2 * Math.PI)) {
            return this.ellipse.svg(attrs);
        }
        let largeArcFlag = this.sweep <= Math.PI ? "0" : "1";
        let sweepFlag = this.counterClockwise ? "1" : "0";
        let rotation = this.angle * 180 / Math.PI;
        return `\n<path d="M${this.start.x},${this.start.y}
                             A${this.rx},${this.ry} ${rotation} ${largeArcFlag},${sweepFlag} ${this.end.x},${this.end.y}"
                    ${convertToString({fill: "none", ...attrs})} />`
    }
}

function normalizeAngle(angle) {
    angle = angle % Flatten.PIx2;
    if (angle < 0) angle += Flatten.PIx2;
    return angle;
}

/**
 * Derivative of the ellipse point by the parameter t
 */
function ellipseDerivative(rx, ry, angle, t) {
    let cos = Math.cos(angle);
    let sin = Math.sin(angle);
    let dx = -rx * Math.sin(t);
    let dy = ry * Math.cos(t);
    return new Flatten.Vector(cos * dx - sin * dy, sin * dx + cos * dy);
}

function ellipseSpeed(rx, ry, t) {
    let dx = rx * Math.sin(t);
    let dy = ry * Math.cos(t);
    return Math.sqrt(dx * dx + dy * dy);
}

// 10-point Gauss-Legendre nodes and weights on [-1, 1]
const GL_NODES = [
    -0.9739065285171717, -0.8650633666889845, -0.6794095682990244, -0.4333953941292472, -0.1488743389816312,
    0.1488743389816312, 0.4333953941292472, 0.6794095682990244, 0.8650633666889845, 0.9739065285171717
];
const GL_WEIGHTS = [
    0.0666713443086881, 0.1494513491505806, 0.2190863625159820, 0.2692667193099963, 0.2955242247147529,
    0.2955242247147529, 0.2692667193099963, 0.2190863625159820, 0.1494513491505806, 0.0666713443086881
];

function gaussLegendre(rx, ry, t0, t1) {
    let half = (t1 - t0) / 2;
    let mid = (t1 + t0) / 2;
    let sum = 0;
    for (let i = 0; i < GL_NODES.length; i++) {
        sum += GL_WEIGHTS[i] * ellipseSpeed(rx, ry, mid + half * GL_NODES[i]);
    }
    return sum * half;
}

function adaptiveLength(rx, ry, t0, t1, whole, tol, depth) {
    let mid = (t0 + t1) / 2;
    let left = gaussLegendre(rx, ry, t0, mid);
    let right = gaussLegendre(rx, ry, mid, t1);
    if (depth <= 0 || Math.abs(left + right - whole) <= tol) {
        return left + right;
    }
    return adaptiveLength(rx, ry, t0, mid, left, tol / 2, depth - 1) +
        adaptiveLength(rx, ry, mid, t1, right, tol / 2, depth - 1);
}

/**
 * Length of the ellipse arc between parameters t0 < t1
 */
export function ellipseArcLength(rx, ry, t0, t1) {
    if (t1 <= t0) return 0;
    // split into pieces not longer than PI/4 to resolve eccentric ellipses
    let n = Math.max(1, Math.ceil((t1 - t0) / (Math.PI / 4)));
    let step = (t1 - t0) / n;
    let tol = 1e-13 * Math.max(rx, ry);
    let length = 0;
    for (let i = 0; i < n; i++) {
        let a = t0 + i * step;
        let b = i === n - 1 ? t1 : a + step;
        length += adaptiveLength(rx, ry, a, b, gaussLegendre(rx, ry, a, b), tol, 20);
    }
    return length;
}

Flatten.EllipticArc = EllipticArc;
/**
 * Function to create elliptic arc equivalent to "new" constructor
 * @param args
 */
export const ellipticArc = (...args) => new Flatten.EllipticArc(...args);
Flatten.ellipticArc = ellipticArc;
