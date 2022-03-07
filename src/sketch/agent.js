import { inView } from "."
import { height, width } from "./config"

const calcAngle = (v1, v2, s) => {
    const angleRad = Math.atan2(v1.x, v1.y) - Math.atan2(v2.x, v2.y)
    return s.degrees(angleRad)
}

const getBall = (pos, s) => {
    return {
        pos,
        acc: s.createVector(0, .1),
        vel: s.createVector(0, 0),
        wasLeft: false,
        wasRight: false,
        radius: 20
    }
}

export class Agent {
    constructor(sketch, neuralNetwork) {
        this.nn = neuralNetwork
        this.handLeft = sketch.createVector(100, height - 150)
        this.handRight = sketch.createVector(width - 100, height - 150)
        this.handRadius = 100

        this.initPosEtc(sketch)

        this.ballDropped = false
        this.ballCollision = false
    }

    initPosEtc(s) {

        this.balls = []
        const pos1 = s.createVector(this.handLeft.x, 150)
        const pos2 = s.createVector(this.handLeft.x, 250)
        const pos3 = s.createVector(this.handRight.x, 150)

        this.balls.push(getBall(pos1, s))
        this.balls.push(getBall(pos2, s))
        this.balls.push(getBall(pos3, s))
    }

    update(sketch) {
        if (this.ballCollision) return

        this.balls.map(ball => {
            if (!this.ballDropped) {
                this.ballDropped = !inView(ball.pos)
            } else {
                return
            }

            ball.vel.add(ball.acc)
            ball.pos.add(ball.vel)

            const ballFalls = ball.vel.y > 0

            const accRangeX = 1.5
            const accRangeY = -2.5

            const ballVelMag = sketch.map(ball.vel.mag(), 0, 5, 0, 1)

            const distLeft = ball.pos.dist(this.handLeft)
            if (distLeft < this.handRadius / 2) {

                const ballTransformed = ball.pos.copy().sub(this.handLeft)
                // method 1
                //const mappedX = sketch.map(ballTransformed.x, 0, this.handRadius, 0, 1)
                //const mappedY = sketch.map(ballTransformed.y, 0, this.handRadius, 0, 1)
                //var output = this.nn.activate([mappedX, mappedY, 0, ballFalls, ballVelMag]);

                // methode 2
                const angle = calcAngle(ballTransformed, { x: 0, y: 0 }, sketch)
                const mappedAngle = sketch.map(angle, -180, 180, 0, 1)
                const dist = ballTransformed.dist(sketch.createVector(0, 0))
                const mappedDist = sketch.map(dist, 0, this.handRadius / 2, 0, 1)
                var output = this.nn.activate([mappedAngle, mappedDist, 0, ballFalls, ballVelMag]);

                const accX = sketch.map(output[0], 0, 1, 0, accRangeX)
                const accY = sketch.map(output[1], 0, 1, 0, accRangeY)

                if (output[2] > 0.5) {
                    ball.vel.add(sketch.createVector(accX, accY))
                } else {
                    ball.pos.add(sketch.createVector(accX, accY))
                }

                ball.wasLeft = true
                if (ball.wasRight) {
                    this.nn.score += 1
                    ball.wasRight = false
                }
            }

            const distRight = ball.pos.dist(this.handRight)
            if (distRight < this.handRadius / 2) {

                const ballTransformed = ball.pos.copy().sub(this.handRight)
                // method 1
                //const mappedX = sketch.map(ballTransformed.x, 0, this.handRadius, 0, 1)
                //const mappedY = sketch.map(ballTransformed.y, 0, this.handRadius, 0, 1)
                //var output = this.nn.activate([mappedX, mappedY, 1, ballFalls, ballVelMag]);

                // methode 2
                const angle = calcAngle(ballTransformed, { x: 0, y: 0 }, sketch)
                const mappedAngle = sketch.map(angle, -180, 180, 0, 1)
                const dist = ballTransformed.dist(sketch.createVector(0, 0))
                const mappedDist = sketch.map(dist, 0, this.handRadius / 2, 0, 1)
                var output = this.nn.activate([mappedAngle, mappedDist, 1, ballFalls, ballVelMag]);

                const accX = sketch.map(output[0], 0, 1, 0, -accRangeX)
                const accY = sketch.map(output[1], 0, 1, 0, accRangeY)

                if (output[2] > 0.5) {
                    ball.vel.add(sketch.createVector(accX, accY))
                } else {
                    ball.pos.add(sketch.createVector(accX, accY))
                }



                ball.wasRight = true
                if (ball.wasLeft) {
                    this.nn.score += 1
                    ball.wasLeft = false
                }
            }
        })

        this.balls.forEach(b1 => {
            this.balls.forEach(b2 => {
                if (b1 == b2) return

                if (b1.pos.dist(b2.pos) < b1.radius) {
                    this.ballCollision = true
                }
            })
        })

    }
}