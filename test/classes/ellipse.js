'use strict';

import { expect } from 'chai';
import Flatten from '../../index';

import {Point, Ellipse, EllipticArc, Line, Box, Polygon, Matrix} from '../../index';

import {point, vector, circle, ellipse, line, segment, arc, ray, matrix} from '../../index';

describe('#Flatten.Ellipse', function() {
    it('May create new instance of Ellipse', function () {
        let ellipse = new Ellipse(new Point(0,0), 2, 1);
        expect(ellipse).to.be.an.instanceof(Ellipse);
    });
    it('Default constructor creates unit ellipse with zero center and zero angle', function () {
        let ellipse = new Ellipse();
        expect(ellipse.pc).to.deep.equal({x:0, y:0});
        expect(ellipse.rx).to.equal(1);
        expect(ellipse.ry).to.equal(1);
        expect(ellipse.angle).to.equal(0);
    });
    it('Constructor Ellipse(pt, rx, ry) creates new ellipse', function() {
        let ellipse = new Ellipse(new Point(1,1), 3, 2);
        expect(ellipse.pc).to.deep.equal({x:1, y:1});
        expect(ellipse.rx).to.equal(3);
        expect(ellipse.ry).to.equal(2);
        expect(ellipse.angle).to.equal(0);
    });
    it('Constructor Ellipse(pt, rx, ry, angle) creates new rotated ellipse', function() {
        let ellipse = new Ellipse(new Point(1,1), 3, 2, Math.PI/4);
        expect(ellipse.angle).to.equal(Math.PI/4);
    });
    it('New ellipse may be constructed by function call', function() {
        expect(ellipse(point(1,1), 3, 2)).to.deep.equal(new Ellipse(new Point(1,1), 3, 2));
    });
    it('May create new instance by clone', function() {
        let e = new Ellipse(new Point(1,1), 3, 2, 0.5);
        let e1 = e.clone();
        expect(e1).to.deep.equal(e);
        expect(e1 === e).to.be.false;
    });
    it('May stringify and parse ellipse', function() {
        let e = ellipse(point(1,2), 3, 2, 0.5);
        let str = JSON.stringify(e);
        let e_parsed = ellipse(JSON.parse(str));
        expect(e_parsed).to.deep.equal(e);
    });
    it('Method center returns ellipse center', function() {
        let e = ellipse(point(1,2), 3, 2);
        expect(e.center).to.deep.equal({x:1, y:2});
    });
    it('Method pointAt returns point at given parameter', function() {
        let e = ellipse(point(1,1), 2, 1);
        expect(e.pointAt(0).equalTo(point(3,1))).to.be.true;
        expect(e.pointAt(Math.PI/2).equalTo(point(1,2))).to.be.true;
        let er = ellipse(point(0,0), 2, 1, Math.PI/2);
        expect(er.pointAt(0).equalTo(point(0,2))).to.be.true;
    });
    it('Method contains returns true if point belongs to the ellipse', function () {
        let e = new Ellipse(new Point(0,0), 2, 1);
        expect(e.contains(point(1.5, 0))).to.be.true;
        expect(e.contains(point(2, 0))).to.be.true;
        expect(e.contains(point(0, 1))).to.be.true;
        expect(e.contains(point(0, 1.5))).to.be.false;
        expect(e.contains(point(2.1, 0))).to.be.false;
    });
    it('Method contains works for segment, circle, ellipse and box', function () {
        let e = new Ellipse(new Point(0,0), 4, 2);
        expect(e.contains(segment(point(-3,0), point(3,0)))).to.be.true;
        expect(e.contains(segment(point(-3,0), point(3,3)))).to.be.false;
        expect(e.contains(circle(point(0,0), 1))).to.be.true;
        expect(e.contains(circle(point(0,0), 3))).to.be.false;
        expect(e.contains(ellipse(point(0,0), 3, 1))).to.be.true;
        expect(e.contains(ellipse(point(0,0), 5, 1))).to.be.false;
        expect(e.contains(new Box(-1,-1,1,1))).to.be.true;
        expect(e.contains(new Box(-3,-1.5,3,1.5))).to.be.false;
    });
    it('Can return ellipse bounding box', function () {
        let e = new Ellipse(new Point(0,0), 2, 1);
        expect(e.box).to.deep.equal({xmin:-2, ymin:-1, xmax:2, ymax:1});
    });
    it('Can return bounding box of the rotated ellipse', function () {
        let e = new Ellipse(new Point(0,0), 2, 1, Math.PI/2);
        let box = e.box;
        expect(box.xmin).to.be.closeTo(-1, Flatten.DP_TOL);
        expect(box.xmax).to.be.closeTo(1, Flatten.DP_TOL);
        expect(box.ymin).to.be.closeTo(-2, Flatten.DP_TOL);
        expect(box.ymax).to.be.closeTo(2, Flatten.DP_TOL);

        let e45 = new Ellipse(new Point(0,0), 2, 1, Math.PI/4);
        let half = Math.sqrt(2.5);
        expect(e45.box.xmax).to.be.closeTo(half, Flatten.DP_TOL);
        expect(e45.box.ymax).to.be.closeTo(half, Flatten.DP_TOL);
    });
    it('Can transform ellipse into closed CCW elliptic arc', function () {
        let e = new Ellipse(new Point(0,0), 2, 1);
        let ea = e.toEllipticArc(true);
        expect(ea).to.be.an.instanceof(EllipticArc);
        expect(ea.sweep).to.equal(Flatten.PIx2);
        expect(ea.counterClockwise).to.be.true;
        expect(ea.start.equalTo(point(-2,0))).to.be.true;
        expect(ea.end.equalTo(point(-2,0))).to.be.true;
    });
    it('Can transform ellipse into closed CW elliptic arc', function () {
        let e = new Ellipse(new Point(0,0), 2, 1);
        let ea = e.toEllipticArc(false);
        expect(ea.sweep).to.equal(Flatten.PIx2);
        expect(ea.counterClockwise).to.be.false;
        expect(ea.start.equalTo(point(-2,0))).to.be.true;
        expect(ea.end.equalTo(point(-2,0))).to.be.true;
    });
    it('Can translate ellipse', function () {
        let e = ellipse(point(1,1), 2, 1, 0.3);
        let et = e.translate(vector(2,3));
        expect(et.pc.equalTo(point(3,4))).to.be.true;
        expect(et.rx).to.be.closeTo(2, Flatten.DP_TOL);
        expect(et.ry).to.be.closeTo(1, Flatten.DP_TOL);
        expect(et.angle).to.be.closeTo(0.3, Flatten.DP_TOL);
    });
    it('Can rotate ellipse', function () {
        let e = ellipse(point(1,0), 2, 1);
        let er = e.rotate(Math.PI/2, point(0,0));
        expect(er.pc.equalTo(point(0,1))).to.be.true;
        expect(er.rx).to.be.closeTo(2, Flatten.DP_TOL);
        expect(er.ry).to.be.closeTo(1, Flatten.DP_TOL);
        expect(er.angle).to.be.closeTo(Math.PI/2, Flatten.DP_TOL);
    });
    it('Can scale ellipse uniformly and non-uniformly', function () {
        let e = ellipse(point(1,1), 2, 1);
        let es = e.scale(2, 2);
        expect(es.pc.equalTo(point(2,2))).to.be.true;
        expect(es.rx).to.be.closeTo(4, Flatten.DP_TOL);
        expect(es.ry).to.be.closeTo(2, Flatten.DP_TOL);

        let en = e.scale(2, 3);
        expect(en.pc.equalTo(point(2,3))).to.be.true;
        expect(en.rx).to.be.closeTo(4, Flatten.DP_TOL);
        expect(en.ry).to.be.closeTo(3, Flatten.DP_TOL);
    });
    it('Non-uniform scaling of circle-like ellipse may produce ellipse', function () {
        let e = ellipse(point(0,0), 1, 1);
        let es = e.scale(1, 2);
        expect(es.rx).to.be.closeTo(1, Flatten.DP_TOL);
        expect(es.ry).to.be.closeTo(2, Flatten.DP_TOL);
    });
    it('Can transform ellipse with skew matrix', function () {
        let e = ellipse(point(1,2), 3, 1, 0.4);
        let m = new Matrix(1, 0.5, 0.7, 1.2, 3, -1);
        let et = e.transform(m);
        expect(et.pc.equalTo(e.pc.transform(m))).to.be.true;
        for (let t of [0, 0.5, 1, 2, 3, 4, 5, 6]) {
            let pt = e.pointAt(t).transform(m);
            expect(Flatten.Utils.EQ_0(et.distanceTo(pt)[0])).to.be.true;
        }
    });
    it('Can intersect ellipse with line. Case 1 no intersection', function() {
        let e = new Ellipse(new Point(0, 0), 2, 1);
        let l = new Line(point(3, 3), vector(0, 1));
        expect(e.intersect(l).length).to.equal(0);
    });
    it('Can intersect ellipse with line. Case 2 Touching', function() {
        let e = new Ellipse(new Point(0, 0), 2, 1);
        let l = new Line(point(3, 1), vector(0, 1));
        let ip = e.intersect(l);
        expect(ip.length).to.equal(1);
        expect(ip[0].equalTo(point(0, 1))).to.be.true;
    });
    it('Can intersect ellipse with line. Case 3 Two points', function() {
        let e = new Ellipse(new Point(0, 0), 2, 1);
        let l = new Line(point(1, 0), vector(1, 0));
        let ip = e.intersect(l);
        expect(ip.length).to.equal(2);
        let y = Math.sqrt(3) / 2;
        expect(ip.some(pt => pt.equalTo(point(1, y)))).to.be.true;
        expect(ip.some(pt => pt.equalTo(point(1, -y)))).to.be.true;
    });
    it('Can intersect rotated ellipse with line', function() {
        let e = new Ellipse(new Point(0, 0), 2, 1, Math.PI/2);
        let ip = e.intersect(line(point(0, 0), vector(1, 0)));    // vertical line x = 0
        expect(ip.length).to.equal(2);
        expect(ip.some(pt => pt.equalTo(point(0, 2)))).to.be.true;
        expect(ip.some(pt => pt.equalTo(point(0, -2)))).to.be.true;
    });
    it('Can intersect ellipse with ray', function() {
        let e = new Ellipse(new Point(0, 0), 2, 1);
        let ip = e.intersect(ray(point(0, 0)));
        expect(ip.length).to.equal(1);
        expect(ip[0].equalTo(point(2, 0))).to.be.true;
    });
    it('Can intersect ellipse with segment. One point', function() {
        let e = new Ellipse(new Point(0, 0), 2, 1);
        let ip = e.intersect(segment(point(0, 0), point(3, 0)));
        expect(ip.length).to.equal(1);
        expect(ip[0].equalTo(point(2, 0))).to.be.true;
    });
    it('Can intersect ellipse with segment. Two points', function() {
        let e = new Ellipse(new Point(0, 0), 2, 1);
        let ip = e.intersect(segment(point(-3, 0), point(3, 0)));
        expect(ip.length).to.equal(2);
    });
    it('Can intersect ellipse with arc', function() {
        let e = new Ellipse(new Point(0, 0), 2, 1);
        let a = arc(point(0, 0), 1.5, 0, Math.PI, true);
        let ip = e.intersect(a);
        expect(ip.length).to.equal(2);
        for (let pt of ip) {
            expect(pt.y > 0).to.be.true;
            expect(Flatten.Utils.EQ(pt.distanceTo(point(0,0))[0], 1.5)).to.be.true;
        }
    });
    it('Can intersect ellipse with circle - quick reject', function() {
        let e = new Ellipse(new Point(0, 0), 2, 1);
        expect(e.intersect(circle(point(10, 10), 1)).length).to.equal(0);
    });
    it('Can intersect ellipse with circle - circle inside', function() {
        let e = new Ellipse(new Point(0, 0), 2, 1);
        expect(e.intersect(circle(point(0, 0), 0.5)).length).to.equal(0);
    });
    it('Can intersect ellipse with circle - four points', function() {
        let e = new Ellipse(new Point(0, 0), 2, 1);
        let c = circle(point(0, 0), 1.5);
        let ip = e.intersect(c);
        expect(ip.length).to.equal(4);
        for (let pt of ip) {
            expect(Flatten.Utils.EQ(pt.distanceTo(c.pc)[0], 1.5)).to.be.true;
            expect(Flatten.Utils.EQ_0(e.distanceTo(pt)[0])).to.be.true;
        }
    });
    it('Can intersect ellipse with circle - two points', function() {
        let e = new Ellipse(new Point(0, 0), 2, 1);
        let ip = e.intersect(circle(point(2, 0), 1));
        expect(ip.length).to.equal(2);
    });
    it('Can intersect ellipse with circle - touching', function() {
        let e = new Ellipse(new Point(0, 0), 2, 1);
        let ip = e.intersect(circle(point(0, 0), 1));
        expect(ip.length).to.equal(2);
        expect(ip.some(pt => pt.equalTo(point(0, 1)))).to.be.true;
        expect(ip.some(pt => pt.equalTo(point(0, -1)))).to.be.true;

        let ip2 = e.intersect(circle(point(3, 0), 1));
        expect(ip2.length).to.equal(1);
        expect(ip2[0].equalTo(point(2, 0))).to.be.true;
    });
    it('Can intersect ellipse with circle - same shape, one intersection, leftmost point', function() {
        let e = new Ellipse(new Point(0, 0), 2, 2);
        let ip = e.intersect(circle(point(0, 0), 2));
        expect(ip.length).to.equal(1);
        expect(ip[0].equalTo(point(-2, 0))).to.be.true;
    });
    it('Can intersect ellipse with ellipse - four points', function() {
        let e1 = new Ellipse(new Point(0, 0), 2, 1);
        let e2 = new Ellipse(new Point(0, 0), 1, 2);
        let ip = e1.intersect(e2);
        expect(ip.length).to.equal(4);
        let v = 2 / Math.sqrt(5);
        expect(ip.some(pt => pt.equalTo(point(v, v)))).to.be.true;
        expect(ip.some(pt => pt.equalTo(point(-v, -v)))).to.be.true;
    });
    it('Can intersect ellipse with ellipse - same ellipse, one intersection', function() {
        let e1 = new Ellipse(new Point(0, 0), 2, 1);
        let e2 = new Ellipse(new Point(0, 0), 1, 2, Math.PI/2);
        let ip = e1.intersect(e2);
        expect(ip.length).to.equal(1);
        expect(ip[0].equalTo(point(-2, 0))).to.be.true;
    });
    it('Can intersect rotated ellipses', function() {
        let e1 = new Ellipse(new Point(0, 0), 3, 1, Math.PI/6);
        let e2 = new Ellipse(new Point(1, 0), 3, 1, -Math.PI/6);
        let ip = e1.intersect(e2);
        expect(ip.length).to.equal(4);
        for (let pt of ip) {
            expect(Flatten.Utils.EQ_0(e1.distanceTo(pt)[0])).to.be.true;
            expect(Flatten.Utils.EQ_0(e2.distanceTo(pt)[0])).to.be.true;
        }
    });
    it('Intersect ellipse with polygon', function() {
        let e = new Ellipse(new Point(0, 0), 2, 1);
        let polygon = new Polygon(new Box(0, 0, 4, 4));
        let ip = e.intersect(polygon);
        expect(ip.length).to.equal(2);
        expect(ip.some(pt => pt.equalTo(point(0, 1)))).to.be.true;
        expect(ip.some(pt => pt.equalTo(point(2, 0)))).to.be.true;
    });
    it('Intersect ellipse with box', function() {
        let e = new Ellipse(new Point(0, 0), 2, 1);
        let ip = e.intersect(new Box(-1, -2, 1, 2));
        expect(ip.length).to.equal(4);
        let y = Math.sqrt(3) / 2;
        expect(ip.some(pt => pt.equalTo(point(1, y)))).to.be.true;
        expect(ip.some(pt => pt.equalTo(point(-1, -y)))).to.be.true;
    });

    describe('#Flatten.Ellipse.DistanceTo', function () {
        it('Can measure distance between ellipse and point', function () {
            let e = ellipse(point(0, 0), 2, 1);
            let [dist, shortest_segment] = e.distanceTo(point(4, 0));
            expect(dist).to.be.closeTo(2, Flatten.DP_TOL);
            expect(shortest_segment.ps.equalTo(point(2, 0))).to.be.true;
            expect(shortest_segment.pe.equalTo(point(4, 0))).to.be.true;
        });
        it('Can measure distance between ellipse and point inside', function () {
            let e = ellipse(point(0, 0), 2, 1);
            let [dist, shortest_segment] = e.distanceTo(point(0, 0.5));
            expect(dist).to.be.closeTo(0.5, Flatten.DP_TOL);
            expect(shortest_segment.ps.equalTo(point(0, 1))).to.be.true;
        });
        it('Can measure distance between ellipse and point in the center', function () {
            let e = ellipse(point(1, 1), 2, 1, Math.PI/2);
            let [dist, shortest_segment] = e.distanceTo(point(1, 1));
            expect(dist).to.be.closeTo(1, Flatten.DP_TOL);
            expect(Flatten.Utils.EQ(shortest_segment.ps.y, 1)).to.be.true;
        });
        it('Can measure distance between ellipse and point off the axes', function () {
            let e = ellipse(point(0, 0), 2, 1);
            let pt = point(3, 2);
            let [dist, shortest_segment] = e.distanceTo(pt);
            // closest point on ellipse has normal pointing to the point
            let q = shortest_segment.ps;
            expect(Flatten.Utils.EQ(q.x * q.x / 4 + q.y * q.y, 1)).to.be.true;
            let normal = vector(q.x / 4, q.y);
            expect(Flatten.Utils.EQ_0(normal.cross(vector(q, pt)))).to.be.true;
            expect(dist).to.be.closeTo(q.distanceTo(pt)[0], Flatten.DP_TOL);
        });
        it('Can measure distance between ellipse and line', function () {
            let e = ellipse(point(0, 0), 2, 1);
            let [dist, shortest_segment] = e.distanceTo(line(point(0, 3), vector(0, 1)));
            expect(dist).to.be.closeTo(2, Flatten.DP_TOL);
            expect(shortest_segment.ps.equalTo(point(0, 1))).to.be.true;
            expect(shortest_segment.pe.equalTo(point(0, 3))).to.be.true;
        });
        it('Can measure distance between rotated ellipse and line', function () {
            let e = ellipse(point(0, 0), 2, 1, Math.PI/4);
            let [dist, shortest_segment] = e.distanceTo(line(point(5, 0), vector(1, 0)));
            expect(dist).to.be.closeTo(5 - e.box.xmax, Flatten.DP_TOL);
        });
        it('Can measure distance between ellipse and segment', function () {
            let e = ellipse(point(0, 0), 2, 1);
            let [dist, shortest_segment] = e.distanceTo(segment(point(-1, 3), point(1, 3)));
            expect(dist).to.be.closeTo(2, Flatten.DP_TOL);
            expect(shortest_segment.ps.equalTo(point(0, 1))).to.be.true;
            expect(shortest_segment.pe.equalTo(point(0, 3))).to.be.true;

            let [dist2] = e.distanceTo(segment(point(3, 0), point(5, 0)));
            expect(dist2).to.be.closeTo(1, Flatten.DP_TOL);
        });
        it('Can measure distance between ellipse and arc', function () {
            let e = ellipse(point(0, 0), 2, 1);
            let [dist, shortest_segment] = e.distanceTo(arc(point(0, 0), 4, -Math.PI/4, Math.PI/4, true));
            expect(dist).to.be.closeTo(2, Flatten.DP_TOL);
            expect(shortest_segment.ps.equalTo(point(2, 0))).to.be.true;
            expect(shortest_segment.pe.equalTo(point(4, 0))).to.be.true;
        });
        it('Can measure distance between ellipse and circle', function () {
            let e = ellipse(point(0, 0), 2, 1);
            let [dist, shortest_segment] = e.distanceTo(circle(point(5, 0), 1));
            expect(dist).to.be.closeTo(2, Flatten.DP_TOL);
            expect(shortest_segment.ps.equalTo(point(2, 0))).to.be.true;
            expect(shortest_segment.pe.equalTo(point(4, 0))).to.be.true;
        });
        it('Can measure distance between ellipse and circle inside the ellipse', function () {
            let e = ellipse(point(0, 0), 4, 2);
            let [dist] = e.distanceTo(circle(point(0, 0), 1));
            expect(dist).to.be.closeTo(1, Flatten.DP_TOL);
        });
        it('Can measure distance between ellipse and circle around the ellipse', function () {
            let e = ellipse(point(0, 0), 2, 1);
            let [dist, shortest_segment] = e.distanceTo(circle(point(0, 0), 5));
            expect(dist).to.be.closeTo(3, Flatten.DP_TOL);
            expect(Flatten.Utils.EQ(Math.abs(shortest_segment.ps.x), 2)).to.be.true;
        });
        it('Can measure distance between two ellipses', function () {
            let e1 = ellipse(point(0, 0), 2, 1);
            let e2 = ellipse(point(6, 0), 2, 1);
            let [dist, shortest_segment] = e1.distanceTo(e2);
            expect(dist).to.be.closeTo(2, Flatten.DP_TOL);
            expect(shortest_segment.ps.equalTo(point(2, 0))).to.be.true;
            expect(shortest_segment.pe.equalTo(point(4, 0))).to.be.true;

            let e3 = ellipse(point(0, 5), 2, 1, Math.PI/2);
            let [dist2] = e1.distanceTo(e3);
            expect(dist2).to.be.closeTo(2, Flatten.DP_TOL);
        });
        it('Can measure distance between ellipse and polygon', function () {
            let e = ellipse(point(0, 0), 2, 1);
            let polygon = new Polygon([point(4, -1), point(6, -1), point(6, 1), point(4, 1)]);
            let [dist, shortest_segment] = e.distanceTo(polygon);
            expect(dist).to.be.closeTo(2, Flatten.DP_TOL);
            expect(shortest_segment.ps.equalTo(point(2, 0))).to.be.true;
            expect(shortest_segment.pe.equalTo(point(4, 0))).to.be.true;
        });
        it('Can measure distance between ellipse and box', function () {
            let e = ellipse(point(0, 0), 2, 1);
            let [dist, shortest_segment] = e.distanceTo(new Box(-1, 3, 1, 4));
            expect(dist).to.be.closeTo(2, Flatten.DP_TOL);
            expect(shortest_segment.ps.equalTo(point(0, 1))).to.be.true;
            expect(shortest_segment.pe.equalTo(point(0, 3))).to.be.true;
        });
        it('Returns zero distance for intersected shapes', function () {
            let e = ellipse(point(0, 0), 2, 1);
            expect(e.distanceTo(circle(point(2, 0), 1))[0]).to.equal(0);
            expect(e.distanceTo(segment(point(0, 0), point(3, 0)))[0]).to.equal(0);
            expect(e.distanceTo(line(point(0, 0), vector(1, 1)))[0]).to.equal(0);
        });
    });

    it('Method svg() without parameters creates svg string with default attributes', function() {
        let svg = ellipse(point(100,50), 30, 20).svg();
        expect(svg.search("ellipse")).to.not.equal(-1);
        expect(svg.search("rx=\"30\"")).to.not.equal(-1);
        expect(svg.search("ry=\"20\"")).to.not.equal(-1);
        expect(svg.search("stroke")).to.not.equal(-1);
        expect(svg.search("transform")).to.equal(-1);
    });
    it('Method svg() with extra parameters may add additional attributes', function() {
        let svg = ellipse(point(100,50), 30, 20).svg({id:"123",className:"name"});
        expect(svg.search("stroke")).to.not.equal(-1);
        expect(svg.search("id")).to.not.equal(-1);
        expect(svg.search("class")).to.not.equal(-1);
    });
    it('Method svg() of rotated ellipse adds rotate transform', function() {
        let svg = ellipse(point(100,50), 30, 20, Math.PI/2).svg();
        expect(svg.search("rotate\\(90 100 50\\)")).to.not.equal(-1);
    });
});
