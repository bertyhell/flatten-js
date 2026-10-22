'use strict';

import { expect } from 'chai';
import Flatten from '../../index';

import {Point, EllipticArc, Box, Polygon, Multiline, Matrix} from '../../index';
import {point, vector, circle, ellipse, ellipticArc, line, segment, arc, ray} from '../../index';

describe('#Flatten.EllipticArc', function() {
    it('May create new instance of EllipticArc', function () {
        let ea = new EllipticArc();
        expect(ea).to.be.an.instanceof(EllipticArc);
    });
    it('Default constructor constructs full unit ellipse arc with zero center and sweep 2PI CCW', function() {
        let ea = new EllipticArc();
        expect(ea.pc).to.deep.equal({x: 0, y: 0});
        expect(ea.rx).to.equal(1);
        expect(ea.ry).to.equal(1);
        expect(ea.angle).to.equal(0);
        expect(ea.sweep).to.equal(Flatten.PIx2);
        expect(ea.counterClockwise).to.equal(Flatten.CCW);
    });
    it('Constructor creates elliptic arc with given parameters', function () {
        let ea = new EllipticArc(point(1, 1), 3, 2, 0.5, 0, Math.PI/2, false);
        expect(ea.pc).to.deep.equal({x: 1, y: 1});
        expect(ea.rx).to.equal(3);
        expect(ea.ry).to.equal(2);
        expect(ea.angle).to.equal(0.5);
        expect(ea.startAngle).to.equal(0);
        expect(ea.endAngle).to.equal(Math.PI/2);
        expect(ea.counterClockwise).to.be.false;
    });
    it('New elliptic arc may be constructed by function call', function() {
        expect(ellipticArc(point(1,1), 3, 2, 0, 0, 1)).to.deep.equal(new EllipticArc(point(1,1), 3, 2, 0, 0, 1));
    });
    it('May create new instance by clone', function() {
        let ea = ellipticArc(point(1,1), 3, 2, 0.3, 0, 1, false);
        let ea1 = ea.clone();
        expect(ea1).to.deep.equal(ea);
        expect(ea1 === ea).to.be.false;
    });
    it('May stringify and parse elliptic arc', function() {
        let ea = ellipticArc(point(1,1), 3, 2, 0.3, 0, 1, false);
        let ea_parsed = ellipticArc(JSON.parse(JSON.stringify(ea)));
        expect(ea_parsed).to.deep.equal(ea);
    });
    it('Returns supporting ellipse', function() {
        let ea = ellipticArc(point(1,1), 3, 2, 0.3, 0, 1);
        expect(ea.ellipse).to.deep.equal(ellipse(point(1,1), 3, 2, 0.3));
    });
    it('Can calculate start, end and middle points', function () {
        let ea = ellipticArc(point(0,0), 2, 1, 0, 0, Math.PI, true);
        expect(ea.start.equalTo(point(2,0))).to.be.true;
        expect(ea.end.equalTo(point(-2,0))).to.be.true;
        expect(ea.middle().equalTo(point(0,1))).to.be.true;
        let ea_cw = ellipticArc(point(0,0), 2, 1, 0, 0, Math.PI, false);
        expect(ea_cw.middle().equalTo(point(0,-1))).to.be.true;
    });
    it('Can calculate sweep angle', function () {
        expect(ellipticArc(point(), 2, 1, 0, 0, Math.PI/2, true).sweep).to.be.closeTo(Math.PI/2, Flatten.DP_TOL);
        expect(ellipticArc(point(), 2, 1, 0, 0, Math.PI/2, false).sweep).to.be.closeTo(3*Math.PI/2, Flatten.DP_TOL);
        expect(ellipticArc(point(), 2, 1, 0, Math.PI, -Math.PI, true).sweep).to.equal(Flatten.PIx2);
    });
    it('Length of circular elliptic arc equals length of the circular arc', function () {
        let ea = ellipticArc(point(), 3, 3, 0, 0, Math.PI/2, true);
        expect(ea.length).to.be.closeTo(3*Math.PI/2, 1e-10);
    });
    it('Can calculate length of elliptic arc', function () {
        // Perimeter of ellipse with semi-axes 2 and 1 (reference value)
        let ea = ellipse(point(), 2, 1).toEllipticArc();
        expect(ea.length).to.be.closeTo(9.688448220547675, 1e-10);
        // Quarter of the ellipse
        expect(ellipticArc(point(), 2, 1, 0, 0, Math.PI/2).length).to.be.closeTo(9.688448220547675 / 4, 1e-10);
    });
    it('Can return point at length', function () {
        let ea = ellipticArc(point(), 2, 1, 0, 0, Math.PI, true);
        expect(ea.pointAtLength(0).equalTo(ea.start)).to.be.true;
        expect(ea.pointAtLength(ea.length).equalTo(ea.end)).to.be.true;
        expect(ea.pointAtLength(ea.length / 2).equalTo(point(0, 1))).to.be.true;
        expect(ea.pointAtLength(ea.length + 1)).to.be.null;
        let pt = ea.pointAtLength(1);
        let [first] = ea.split(pt);
        expect(first.length).to.be.closeTo(1, Flatten.DP_TOL);
    });
    it('Can calculate bounding box of elliptic arc', function () {
        let ea = ellipticArc(point(), 2, 1, 0, -Math.PI/2, Math.PI/2, true);
        let box = ea.box;
        expect(box.xmin).to.be.closeTo(0, Flatten.DP_TOL);
        expect(box.xmax).to.be.closeTo(2, Flatten.DP_TOL);
        expect(box.ymin).to.be.closeTo(-1, Flatten.DP_TOL);
        expect(box.ymax).to.be.closeTo(1, Flatten.DP_TOL);
    });
    it('Can calculate bounding box of rotated elliptic arc', function () {
        let ea = ellipse(point(), 2, 1, Math.PI/4).toEllipticArc();
        let half = Math.sqrt(2.5);
        expect(ea.box.xmax).to.be.closeTo(half, Flatten.DP_TOL);
        expect(ea.box.ymin).to.be.closeTo(-half, Flatten.DP_TOL);
    });
    it('Method contains returns true if point belongs to the elliptic arc', function () {
        let ea = ellipticArc(point(), 2, 1, 0, 0, Math.PI, true);
        expect(ea.contains(point(0, 1))).to.be.true;
        expect(ea.contains(point(2, 0))).to.be.true;
        expect(ea.contains(point(-2, 0))).to.be.true;
        expect(ea.contains(point(0, -1))).to.be.false;
        expect(ea.contains(point(0, 0))).to.be.false;
    });
    it('Can split elliptic arc by point', function () {
        let ea = ellipticArc(point(), 2, 1, 0, 0, Math.PI, true);
        let [ea1, ea2] = ea.split(point(0, 1));
        expect(ea1.start.equalTo(point(2, 0))).to.be.true;
        expect(ea1.end.equalTo(point(0, 1))).to.be.true;
        expect(ea2.start.equalTo(point(0, 1))).to.be.true;
        expect(ea2.end.equalTo(point(-2, 0))).to.be.true;
        expect(ea1.length + ea2.length).to.be.closeTo(ea.length, Flatten.DP_TOL);
    });
    it('Split by start or end point returns clone and null', function () {
        let ea = ellipticArc(point(), 2, 1, 0, 0, Math.PI, true);
        let [s1, s2] = ea.split(ea.start);
        expect(s1).to.be.null;
        expect(s2).to.deep.equal(ea);
        let [e1, e2] = ea.split(ea.end);
        expect(e1).to.deep.equal(ea);
        expect(e2).to.be.null;
    });
    it('Can reverse elliptic arc', function () {
        let ea = ellipticArc(point(), 2, 1, 0, 0, Math.PI/2, true);
        let rev = ea.reverse();
        expect(rev.start.equalTo(ea.end)).to.be.true;
        expect(rev.end.equalTo(ea.start)).to.be.true;
        expect(rev.counterClockwise).to.be.false;
        expect(rev.middle().equalTo(ea.middle())).to.be.true;
    });
    it('Can calculate tangents in start and end points', function () {
        let ea = ellipticArc(point(), 2, 1, 0, 0, Math.PI/2, true);
        expect(ea.tangentInStart().equalTo(vector(0, 1))).to.be.true;
        expect(ea.tangentInEnd().equalTo(vector(1, 0))).to.be.true;
        let ea_cw = ea.reverse();
        expect(ea_cw.tangentInStart().equalTo(vector(1, 0))).to.be.true;
        expect(ea_cw.tangentInEnd().equalTo(vector(0, 1))).to.be.true;
    });
    it('Can break elliptic arc to functional sub-arcs', function () {
        let ea = ellipse(point(), 2, 1).toEllipticArc();
        let f_arcs = ea.breakToFunctional();
        expect(f_arcs.length).to.equal(4);
        let length = f_arcs.reduce((acc, a) => acc + a.length, 0);
        expect(length).to.be.closeTo(ea.length, Flatten.DP_TOL);
        expect(ellipticArc(point(), 2, 1, 0, 0.1, 0.2).breakToFunctional().length).to.equal(1);
    });
    it('Definite integral of full CCW ellipse equals minus area', function () {
        let ea = ellipse(point(1, 2), 2, 1, 0.3).toEllipticArc(true);
        expect(ea.definiteIntegral(0)).to.be.closeTo(-2 * Math.PI, Flatten.DP_TOL);
        let ea_cw = ellipse(point(1, 2), 2, 1, 0.3).toEllipticArc(false);
        expect(ea_cw.definiteIntegral(0)).to.be.closeTo(2 * Math.PI, Flatten.DP_TOL);
    });
    it('Definite integral of circular elliptic arc equals definite integral of arc', function () {
        let a = arc(point(1, 1), 2, 0.3, 2.5, true);
        let ea = ellipticArc(point(1, 1), 2, 2, 0, 0.3, 2.5, true);
        expect(ea.definiteIntegral(-1)).to.be.closeTo(a.definiteIntegral(-1), Flatten.DP_TOL);
    });
    it('Can translate and rotate elliptic arc', function () {
        let ea = ellipticArc(point(), 2, 1, 0, 0, Math.PI/2, true);
        let et = ea.translate(vector(1, 1));
        expect(et.start.equalTo(point(3, 1))).to.be.true;
        expect(et.end.equalTo(point(1, 2))).to.be.true;
        let er = ea.rotate(Math.PI/2);
        expect(er.start.equalTo(point(0, 2))).to.be.true;
        expect(er.end.equalTo(point(-1, 0))).to.be.true;
        expect(er.middle().equalTo(ea.middle().rotate(Math.PI/2))).to.be.true;
    });
    it('Can scale elliptic arc non-uniformly', function () {
        let ea = ellipticArc(point(), 1, 1, 0, 0, Math.PI/2, true);
        let es = ea.scale(3, 2);
        expect(es.rx).to.be.closeTo(3, Flatten.DP_TOL);
        expect(es.ry).to.be.closeTo(2, Flatten.DP_TOL);
        expect(es.start.equalTo(point(3, 0))).to.be.true;
        expect(es.end.equalTo(point(0, 2))).to.be.true;
    });
    it('Mirror transformation changes direction of elliptic arc', function () {
        let ea = ellipticArc(point(), 2, 1, 0, 0, Math.PI/2, true);
        let em = ea.transform(new Matrix().scale(-1, 1));
        expect(em.counterClockwise).to.be.false;
        expect(em.start.equalTo(point(-2, 0))).to.be.true;
        expect(em.end.equalTo(point(0, 1))).to.be.true;
        expect(em.middle().equalTo(point(-Math.sqrt(2), Math.sqrt(0.5)))).to.be.true;
    });
    it('Can intersect elliptic arc with line, segment and ray', function () {
        let ea = ellipticArc(point(), 2, 1, 0, 0, Math.PI, true);
        let ip_line = ea.intersect(line(point(1, 0), vector(1, 0)));
        expect(ip_line.length).to.equal(1);
        expect(ip_line[0].equalTo(point(1, Math.sqrt(3)/2))).to.be.true;
        expect(ea.intersect(segment(point(0, -2), point(0, 2))).length).to.equal(1);
        let ip_ray = ea.intersect(ray(point(0, 0), vector(-1, 0)));   // ray directed up
        expect(ip_ray.length).to.equal(1);
        expect(ip_ray[0].equalTo(point(0, 1))).to.be.true;
    });
    it('Can intersect elliptic arc with circle, arc, ellipse and elliptic arc', function () {
        let ea = ellipticArc(point(), 2, 1, 0, 0, Math.PI, true);
        expect(ea.intersect(circle(point(), 1.5)).length).to.equal(2);
        expect(ea.intersect(arc(point(), 1.5, 0, Math.PI/2, true)).length).to.equal(1);
        expect(ea.intersect(ellipse(point(), 1, 2)).length).to.equal(2);
        expect(ea.intersect(ellipticArc(point(), 1, 2, 0, -Math.PI/2, Math.PI/2, true)).length).to.equal(1);
    });
    it('Can intersect overlapping elliptic arcs', function () {
        let ea1 = ellipticArc(point(), 2, 1, 0, 0, Math.PI, true);
        let ea2 = ellipticArc(point(), 2, 1, 0, Math.PI/2, 3*Math.PI/2, true);
        let ip = ea1.intersect(ea2);
        expect(ip.length).to.equal(2);
        expect(ip.some(pt => pt.equalTo(point(-2, 0)))).to.be.true;
        expect(ip.some(pt => pt.equalTo(point(0, 1)))).to.be.true;
    });
    it('Can intersect elliptic arc with box and polygon', function () {
        let ea = ellipticArc(point(), 2, 1, 0, 0, Math.PI, true);
        expect(ea.intersect(new Box(-1, -2, 1, 2)).length).to.equal(2);
        expect(ea.intersect(new Polygon(new Box(-1, -2, 1, 2))).length).to.equal(2);
    });

    describe('#Flatten.EllipticArc.DistanceTo', function () {
        it('Can measure distance between elliptic arc and point', function () {
            let ea = ellipticArc(point(), 2, 1, 0, 0, Math.PI, true);
            let [dist, shortest_segment] = ea.distanceTo(point(0, 3));
            expect(dist).to.be.closeTo(2, Flatten.DP_TOL);
            expect(shortest_segment.ps.equalTo(point(0, 1))).to.be.true;
            expect(shortest_segment.pe.equalTo(point(0, 3))).to.be.true;
        });
        it('Distance to point whose closest ellipse point is not on the arc is measured to the arc end', function () {
            let ea = ellipticArc(point(), 2, 1, 0, 0, Math.PI, true);
            let [dist, shortest_segment] = ea.distanceTo(point(0, -3));
            expect(dist).to.be.closeTo(Math.sqrt(13), Flatten.DP_TOL);
            expect(Flatten.Utils.EQ(Math.abs(shortest_segment.ps.x), 2)).to.be.true;
        });
        it('Can measure distance between elliptic arc and line', function () {
            let ea = ellipticArc(point(), 2, 1, 0, 0, Math.PI, true);
            let [dist, shortest_segment] = ea.distanceTo(line(point(0, 3), vector(0, 1)));
            expect(dist).to.be.closeTo(2, Flatten.DP_TOL);
            expect(shortest_segment.ps.equalTo(point(0, 1))).to.be.true;
        });
        it('Can measure distance between elliptic arc and segment', function () {
            let ea = ellipticArc(point(), 2, 1, 0, 0, Math.PI, true);
            let [dist] = ea.distanceTo(segment(point(3, -1), point(3, 1)));
            expect(dist).to.be.closeTo(1, Flatten.DP_TOL);
        });
        it('Can measure distance between elliptic arc and circle', function () {
            let ea = ellipticArc(point(), 2, 1, 0, 0, Math.PI, true);
            let [dist] = ea.distanceTo(circle(point(5, 0), 1));
            expect(dist).to.be.closeTo(2, Flatten.DP_TOL);
        });
        it('Can measure distance between elliptic arc and arc', function () {
            let ea = ellipticArc(point(), 2, 1, 0, 0, Math.PI, true);
            let [dist] = ea.distanceTo(arc(point(0, 0), 4, 0, Math.PI/2, true));
            expect(dist).to.be.closeTo(2, Flatten.DP_TOL);
        });
        it('Can measure distance between elliptic arc and ellipse', function () {
            let ea = ellipticArc(point(), 2, 1, 0, 0, Math.PI, true);
            let [dist, shortest_segment] = ea.distanceTo(ellipse(point(6, 0), 2, 1));
            expect(dist).to.be.closeTo(2, Flatten.DP_TOL);
            expect(shortest_segment.ps.equalTo(point(2, 0))).to.be.true;
            expect(shortest_segment.pe.equalTo(point(4, 0))).to.be.true;
        });
        it('Can measure distance between two elliptic arcs', function () {
            let ea1 = ellipticArc(point(), 2, 1, 0, 0, Math.PI, true);
            let ea2 = ellipticArc(point(0, 4), 2, 1, 0, Math.PI, 2*Math.PI, true);
            let [dist, shortest_segment] = ea1.distanceTo(ea2);
            expect(dist).to.be.closeTo(2, Flatten.DP_TOL);
            expect(shortest_segment.ps.equalTo(point(0, 1))).to.be.true;
            expect(shortest_segment.pe.equalTo(point(0, 3))).to.be.true;
        });
        it('Can measure distance between elliptic arc and polygon', function () {
            let ea = ellipticArc(point(), 2, 1, 0, 0, Math.PI, true);
            let [dist] = ea.distanceTo(new Polygon(new Box(-1, 3, 1, 4)));
            expect(dist).to.be.closeTo(2, Flatten.DP_TOL);
        });
    });

    it('Method svg() creates svg path with elliptic arc command', function() {
        let ea = ellipticArc(point(100, 100), 30, 20, Math.PI/2, 0, Math.PI/2, true);
        let svg = ea.svg();
        expect(svg.search("<path")).to.not.equal(-1);
        expect(svg.search("A30,20 90 0,1")).to.not.equal(-1);
        expect(svg.search("stroke")).to.not.equal(-1);
    });
    it('Method svg() of full elliptic arc creates ellipse', function() {
        let svg = ellipse(point(100, 100), 30, 20).toEllipticArc().svg({id: "123"});
        expect(svg.search("<ellipse")).to.not.equal(-1);
        expect(svg.search("id")).to.not.equal(-1);
    });
});

describe('#Flatten.EllipticArc as polygon and multiline edge', function() {
    it('Polygon may be created from ellipse', function() {
        let polygon = new Polygon(ellipse(point(1, 1), 2, 1, 0.5));
        expect(polygon.faces.size).to.equal(1);
        expect(polygon.edges.size).to.equal(1);
        expect(polygon.area()).to.be.closeTo(2 * Math.PI, Flatten.DP_TOL);
    });
    it('Polygon from ellipse contains points inside', function() {
        let polygon = new Polygon(ellipse(point(0, 0), 2, 1));
        expect(polygon.contains(point(0, 0))).to.be.true;
        expect(polygon.contains(point(1.9, 0))).to.be.true;
        expect(polygon.contains(point(2, 0))).to.be.true;
        expect(polygon.contains(point(0, 1.1))).to.be.false;
        expect(polygon.contains(point(2.1, 0))).to.be.false;
    });
    it('Polygon may be created from segments and elliptic arcs', function() {
        // half ellipse closed by segment
        let polygon = new Polygon([
            ellipticArc(point(), 2, 1, 0, 0, Math.PI, true),
            segment(point(-2, 0), point(2, 0))
        ]);
        expect(polygon.area()).to.be.closeTo(Math.PI, Flatten.DP_TOL);
        expect(polygon.contains(point(0, 0.5))).to.be.true;
        expect(polygon.contains(point(0, -0.5))).to.be.false;
    });
    it('Polygon with elliptic arc may be stringified and parsed', function() {
        let polygon = new Polygon([
            ellipticArc(point(), 2, 1, 0, 0, Math.PI, true),
            segment(point(-2, 0), point(2, 0))
        ]);
        let parsed = new Polygon(JSON.parse(JSON.stringify(polygon)));
        expect(parsed.area()).to.be.closeTo(polygon.area(), Flatten.DP_TOL);
        expect([...parsed.edges][0].shape).to.be.an.instanceof(EllipticArc);
    });
    it('Polygon with elliptic arc creates svg path with elliptic arc command', function() {
        let polygon = new Polygon(ellipse(point(0, 0), 2, 1));
        let svg = polygon.svg();
        expect(svg.search("A2,1 0")).to.not.equal(-1);
    });
    it('Can calculate area of the polygon with ellipse hole', function() {
        let polygon = new Polygon(new Box(-4, -4, 4, 4));
        polygon.addFace(ellipse(point(0, 0), 2, 1)).reverse();
        expect(polygon.area()).to.be.closeTo(64 - 2 * Math.PI, Flatten.DP_TOL);
    });
    it('Multiline may contain elliptic arc', function() {
        let ea = ellipticArc(point(), 2, 1, 0, 0, Math.PI, true);
        let ml = new Multiline([segment(point(4, 0), point(2, 0)), ea]);
        expect(ml.size).to.equal(2);
        expect(ml.length).to.be.closeTo(2 + ea.length, Flatten.DP_TOL);
        expect(ml.svg().search("A2,1 0")).to.not.equal(-1);
        ml.split([point(0, 1)]);
        expect(ml.size).to.equal(3);
    });
});
