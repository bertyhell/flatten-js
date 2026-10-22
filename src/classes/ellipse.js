"use strict";

import Flatten from '../flatten';
import * as Intersection from '../algorithms/intersection';
import {convertToString} from "../utils/attributes";
import {Shape} from "./shape";
import {Matrix} from "./matrix";

/**
 * Class representing an ellipse. <br/>
 * Ellipse is defined by center point, two semi-axes and rotation angle of the first (x) semi-axis.
 * Points of the ellipse are defined parametrically: <br/>
 * pt(t) = pc + R(angle) * (rx * cos(t), ry * sin(t))
 * @type {Ellipse}
 */
export class Ellipse extends Shape {
    /**
     *
     * @param {Point} pc - ellipse center point
     * @param {number} rx - semi-axis along the (rotated) x-axis
     * @param {number} ry - semi-axis along the (rotated) y-axis
     * @param {number} angle - rotation angle of the ellipse in radians, counterclockwise
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
         * Rotation angle in radians
         * @type {number}
         */
        this.angle = 0;

        if (args.length === 1 && args[0] instanceof Object && args[0].name === "ellipse") {
            let {pc, rx, ry, angle} = args[0];
            this.pc = new Flatten.Point(pc);
            this.rx = rx;
            this.ry = ry;
            this.angle = angle || 0;
        } else {
            let [pc, rx, ry, angle] = [...args];
            if (pc && pc instanceof Flatten.Point) this.pc = pc.clone();
            if (rx !== undefined) this.rx = rx;
            if (ry !== undefined) this.ry = ry;
            if (angle !== undefined) this.angle = angle;
        }
    }

    /**
     * Return new cloned instance of ellipse
     * @returns {Ellipse}
     */
    clone() {
        return new Flatten.Ellipse(this.pc.clone(), this.rx, this.ry, this.angle);
    }

    /**
     * Ellipse center
     * @returns {Point}
     */
    get center() {
        return this.pc;
    }

    /**
     * Ellipse bounding box
     * @returns {Box}
     */
    get box() {
        let [hx, hy] = ellipseHalfExtents(this.rx, this.ry, this.angle);
        return new Flatten.Box(
            this.pc.x - hx,
            this.pc.y - hy,
            this.pc.x + hx,
            this.pc.y + hy
        );
    }

    /**
     * Return point of the ellipse at given parameter t
     * @param {number} t - parametric angle in radians
     * @returns {Point}
     */
    pointAt(t) {
        return ellipsePointAt(this.pc, this.rx, this.ry, this.angle, t);
    }

    /**
     * Return parametric angle t in range [0, 2*PI) of the point projected along the ray from the center
     * @param {Point} pt
     * @returns {number}
     */
    paramOf(pt) {
        let [u, v] = ellipseToUnit(this.pc, this.rx, this.ry, this.angle, pt);
        let t = Math.atan2(v, u);
        return t < 0 ? t + Flatten.PIx2 : t;
    }

    /**
     * Return affine transformation matrix that maps ellipse to the unit circle with center (0,0)
     * @returns {Matrix}
     */
    toUnitMatrix() {
        return new Matrix().scale(1 / this.rx, 1 / this.ry).rotate(-this.angle).translate(-this.pc.x, -this.pc.y);
    }

    /**
     * Return affine transformation matrix that maps unit circle with center (0,0) to the ellipse
     * @returns {Matrix}
     */
    fromUnitMatrix() {
        return new Matrix().translate(this.pc.x, this.pc.y).rotate(this.angle).scale(this.rx, this.ry);
    }

    /**
     * Return true if ellipse contains shape: no point of shape lies outside of the ellipse
     * @param {Shape} shape - test shape
     * @returns {boolean}
     */
    contains(shape) {
        if (shape instanceof Flatten.Point) {
            let [u, v] = ellipseToUnit(this.pc, this.rx, this.ry, this.angle, shape);
            if (u * u + v * v <= 1) return true;
            return Flatten.Utils.EQ_0(Flatten.Distance.point2ellipse(shape, this)[0]);
        }

        if (shape instanceof Flatten.Segment) {
            return this.contains(shape.start) && this.contains(shape.end);
        }

        if (shape instanceof Flatten.Arc || shape instanceof Flatten.EllipticArc) {
            return this.intersect(shape).length === 0 &&
                this.contains(shape.start) && this.contains(shape.end);
        }

        if (shape instanceof Flatten.Circle) {
            return this.intersect(shape).length === 0 && this.contains(shape.toArc().start);
        }

        if (shape instanceof Flatten.Ellipse) {
            return this.intersect(shape).length === 0 && this.contains(shape.pointAt(0));
        }

        if (shape instanceof Flatten.Box) {
            return shape.toPoints().every(pt => this.contains(pt));
        }

        /* TODO: polygon */
    }

    /**
     * Transform ellipse to closed elliptic arc
     * @param {boolean} counterclockwise
     * @returns {EllipticArc}
     */
    toEllipticArc(counterclockwise = true) {
        return new Flatten.EllipticArc(this.center, this.rx, this.ry, this.angle, Math.PI, -Math.PI, counterclockwise);
    }

    /**
     * Return new ellipse transformed using affine transformation matrix. <br/>
     * Affine image of an ellipse is always an ellipse, so any matrix is supported,
     * including non-uniform scaling and skewing.
     * @param {Matrix} matrix - affine transformation matrix
     * @returns {Ellipse}
     */
    transform(matrix = new Flatten.Matrix()) {
        let [rx, ry, angle] = ellipseTransformAxes(this.rx, this.ry, this.angle, matrix);
        return new Flatten.Ellipse(this.pc.transform(matrix), rx, ry, angle);
    }

    /**
     * Returns array of intersection points between ellipse and other shape
     * @param {Shape} shape Shape of the one of supported types
     * @returns {Point[]}
     */
    intersect(shape) {
        if (shape instanceof Flatten.Point) {
            return this.contains(shape) ? [shape] : [];
        }
        if (shape instanceof Flatten.Line) {
            return Intersection.intersectLine2Ellipse(shape, this);
        }
        if (shape instanceof Flatten.Ray) {
            return Intersection.intersectRay2Ellipse(shape, this);
        }
        if (shape instanceof Flatten.Segment) {
            return Intersection.intersectSegment2Ellipse(shape, this);
        }
        if (shape instanceof Flatten.Circle) {
            return Intersection.intersectEllipse2Circle(this, shape);
        }
        if (shape instanceof Flatten.Ellipse) {
            return Intersection.intersectEllipse2Ellipse(this, shape);
        }
        if (shape instanceof Flatten.Box) {
            return Intersection.intersectEllipse2Box(this, shape);
        }
        if (shape instanceof Flatten.Arc) {
            return Intersection.intersectArc2Ellipse(shape, this);
        }
        if (shape instanceof Flatten.EllipticArc) {
            return Intersection.intersectEllipticArc2Ellipse(shape, this);
        }
        if (shape instanceof Flatten.Polygon) {
            return Intersection.intersectEllipse2Polygon(this, shape);
        }
        if (shape instanceof Flatten.Multiline) {
            return Intersection.intersectShape2Multiline(this, shape);
        }
    }

    /**
     * Calculate distance and shortest segment from ellipse to shape and return array [distance, shortest segment]
     * @param {Shape} shape Shape of the one of supported types Point, Line, Circle, Ellipse, Segment, Arc,
     * EllipticArc, Box, Polygon, Multiline or Planar Set
     * @returns {number} distance from ellipse to shape
     * @returns {Segment} shortest segment between ellipse and shape (started at ellipse, ended at shape)
     */
    distanceTo(shape) {
        if (shape instanceof Flatten.Point) {
            let [distance, shortest_segment] = Flatten.Distance.point2ellipse(shape, this);
            shortest_segment = shortest_segment.reverse();
            return [distance, shortest_segment];
        }

        if (shape instanceof Flatten.Circle) {
            let [distance, shortest_segment] = Flatten.Distance.ellipse2circle(this, shape);
            return [distance, shortest_segment];
        }

        if (shape instanceof Flatten.Ellipse) {
            let [distance, shortest_segment] = Flatten.Distance.ellipse2ellipse(this, shape);
            return [distance, shortest_segment];
        }

        if (shape instanceof Flatten.Line) {
            let [distance, shortest_segment] = Flatten.Distance.ellipse2line(this, shape);
            return [distance, shortest_segment];
        }

        if (shape instanceof Flatten.Segment) {
            let [distance, shortest_segment] = Flatten.Distance.segment2ellipse(shape, this);
            shortest_segment = shortest_segment.reverse();
            return [distance, shortest_segment];
        }

        if (shape instanceof Flatten.Arc) {
            let [distance, shortest_segment] = Flatten.Distance.ellipse2arc(this, shape);
            return [distance, shortest_segment];
        }

        if (shape instanceof Flatten.EllipticArc) {
            let [distance, shortest_segment] = Flatten.Distance.ellipticArc2ellipse(shape, this);
            shortest_segment = shortest_segment.reverse();
            return [distance, shortest_segment];
        }

        if (shape instanceof Flatten.Box) {
            let [distance, shortest_segment] = Flatten.Distance.shape2polygon(this, new Flatten.Polygon(shape));
            return [distance, shortest_segment];
        }

        if (shape instanceof Flatten.Polygon) {
            let [distance, shortest_segment] = Flatten.Distance.shape2polygon(this, shape);
            return [distance, shortest_segment];
        }

        if (shape instanceof Flatten.PlanarSet) {
            let [dist, shortest_segment] = Flatten.Distance.shape2planarSet(this, shape);
            return [dist, shortest_segment];
        }

        if (shape instanceof Flatten.Multiline) {
            let [dist, shortest_segment] = Flatten.Distance.shape2multiline(this, shape);
            return [dist, shortest_segment];
        }
    }

    get name() {
        return "ellipse"
    }

    /**
     * Return string to draw ellipse in svg
     * @param {Object} attrs - an object with attributes of svg ellipse element
     * @returns {string}
     */
    svg(attrs = {}) {
        let rotation = this.angle === 0 ? {} :
            {transform: `rotate(${this.angle * 180 / Math.PI} ${this.pc.x} ${this.pc.y})`};
        return `\n<ellipse cx="${this.pc.x}" cy="${this.pc.y}" rx="${this.rx}" ry="${this.ry}"
                ${convertToString({fill: "none", ...rotation, ...attrs})} />`;
    }
}

/**
 * Return point of the ellipse (pc, rx, ry, angle) at parametric angle t
 */
export function ellipsePointAt(pc, rx, ry, angle, t) {
    let cos = Math.cos(angle);
    let sin = Math.sin(angle);
    let x = rx * Math.cos(t);
    let y = ry * Math.sin(t);
    return new Flatten.Point(pc.x + cos * x - sin * y, pc.y + sin * x + cos * y);
}

/**
 * Return coordinates [u,v] of the point in the frame where ellipse (pc, rx, ry, angle) is a unit circle
 */
export function ellipseToUnit(pc, rx, ry, angle, pt) {
    let cos = Math.cos(angle);
    let sin = Math.sin(angle);
    let dx = pt.x - pc.x;
    let dy = pt.y - pc.y;
    return [(cos * dx + sin * dy) / rx, (-sin * dx + cos * dy) / ry];
}

/**
 * Return half width and half height of the bounding box of the ellipse centered at (0,0)
 */
export function ellipseHalfExtents(rx, ry, angle) {
    let cos = Math.cos(angle);
    let sin = Math.sin(angle);
    return [
        Math.sqrt(rx * rx * cos * cos + ry * ry * sin * sin),
        Math.sqrt(rx * rx * sin * sin + ry * ry * cos * cos)
    ];
}

/**
 * Return parameters t of the points where ellipse reaches its extreme x and extreme y values
 */
export function ellipseExtremeParams(rx, ry, angle) {
    let cos = Math.cos(angle);
    let sin = Math.sin(angle);
    let tx = Math.atan2(-ry * sin, rx * cos);
    let ty = Math.atan2(ry * cos, rx * sin);
    return [tx, tx + Math.PI, ty, ty + Math.PI];
}

/**
 * Calculate semi-axes and rotation angle of the image of the ellipse under linear part of affine transformation.
 * Uses closed form singular value decomposition of the 2x2 matrix L * R(angle) * diag(rx, ry).
 * Among equivalent representations of the image, chooses the one whose first axis is closest
 * to the image of the original first axis.
 * @returns {number[]} [rx, ry, angle]
 */
export function ellipseTransformAxes(rx, ry, angle, matrix) {
    let cos = Math.cos(angle);
    let sin = Math.sin(angle);
    let {a, b, c, d} = matrix;
    let m00 = (a * cos + c * sin) * rx;
    let m01 = (-a * sin + c * cos) * ry;
    let m10 = (b * cos + d * sin) * rx;
    let m11 = (-b * sin + d * cos) * ry;

    let E = (m00 + m11) / 2;
    let F = (m00 - m11) / 2;
    let G = (m10 + m01) / 2;
    let H = (m10 - m01) / 2;
    let Q = Math.sqrt(E * E + H * H);
    let R = Math.sqrt(F * F + G * G);
    let s1 = Q + R;
    let s2 = Math.abs(Q - R);
    let phi = (Math.atan2(H, E) + Math.atan2(G, F)) / 2;

    // Direction of the image of the original first axis
    let target = Math.atan2(m10, m00);

    let best_k = 0;
    let best_diff = Number.POSITIVE_INFINITY;
    for (let k = 0; k < 4; k++) {
        let diff = normalizeAngleDiff(phi + k * Math.PI / 2 - target);
        if (Math.abs(diff) < Math.abs(best_diff)) {
            best_diff = diff;
            best_k = k;
        }
    }
    let new_angle = target + best_diff;
    return best_k % 2 === 0 ? [s1, s2, new_angle] : [s2, s1, new_angle];
}

function normalizeAngleDiff(diff) {
    diff = diff % Flatten.PIx2;
    if (diff > Math.PI) diff -= Flatten.PIx2;
    if (diff <= -Math.PI) diff += Flatten.PIx2;
    return diff;
}

Flatten.Ellipse = Ellipse;
/**
 * Shortcut to create new ellipse
 * @param args
 */
export const ellipse = (...args) => new Flatten.Ellipse(...args);
Flatten.ellipse = ellipse;
