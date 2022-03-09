import { inView } from "."
import { height, width } from "./config"

const calcAngle = (v1, v2, s) => {
    const angleRad = Math.atan2(v1.x, v1.y) - Math.atan2(v2.x, v2.y)
    return s.degrees(angleRad)
}

const getBall = (pos, s) => {
    return {
        pos,
        acc: s.createVector(0, 0),
        vel: s.createVector(0, 0),
        wasLeft: false,
        wasRight: false,
        radius: 20,
        dropped: false
    }
}

export class Agent {
    constructor(sketch, neuralNetworkLeft, neuralNetworkRight) {
        this.nnLeft = neuralNetworkLeft
        this.nnLeft.score = 0
        this.nnRight = neuralNetworkRight
        this.nnRight.score = 0
        this.handLeft = sketch.createVector(100, height - 150)
        this.handRight = sketch.createVector(width - 100, height - 150)
        this.handRadius = 100

        this.ballSpawn = sketch.createVector(this.handLeft.x, 150)
        this.initPosEtc(sketch)

        this.ballDropped = false
        this.ballCollision = false

    }

    initPosEtc(s) {
        this.balls = []
        this.balls.push(getBall(this.ballSpawn.copy(), s))
    }

    score() {
        return this.nnLeft.score + this.nnRight.score
    }

    update(s) {
        if (this.ballCollision) return

        if (this.balls.length < 3) {
            if (this.balls[this.balls.length - 1].pos.dist(this.ballSpawn) > 50) {
                this.balls.push(getBall(this.ballSpawn.copy(), s))
            }
        }

        this.balls.filter(b => !b.dropped).map(ball => {
            ball.dropped = !inView(ball.pos)
            //if (!this.ballDropped) {
            //    this.ballDropped = !inView(ball.pos)
            //} else {
            //    return
            //}

            const ballFalls = ball.vel.y > 0

            const accRangeX = 1.5
            const accRangeY = -2.5

            const ballVelX = s.map(ball.vel.x, -10, 10, 0, 1)
            const ballVelY = s.map(ball.vel.y, -10, 10, 0, 1)

            ball.acc = s.createVector(0, 0)

            const distLeft = ball.pos.dist(this.handLeft)
            if (distLeft < this.handRadius / 2) {

                const ballTransformed = ball.pos.copy().sub(this.handLeft)
                // method 1
                const mappedX = s.map(ballTransformed.x, 0, this.handRadius, 0, 1)
                const mappedY = s.map(ballTransformed.y, 0, this.handRadius, 0, 1)
                var output = this.nnLeft.activate([mappedX, mappedY, ballVelX, ballVelY]);

                // methode 2
                //const angle = calcAngle(ballTransformed, { x: 0, y: 0 }, s)
                //const mappedAngle = s.map(angle, -180, 180, 0, 1)
                //const dist = ballTransformed.dist(s.createVector(0, 0))
                //const mappedDist = s.map(dist, 0, this.handRadius / 2, 0, 1)
                //var output = this.nnLeft.activate([mappedAngle, mappedDist, ballFalls, ballVelMag]);

                //const ballVel = ball.vel.normalize()
                //const velX = s.map(ballVel.x, -1, 1, 0, 1)
                //const velY = s.map(ballVel.y, -1, 1, 0, 1)
                //var output = this.nnLeft.activate([velX, velY]);

                const accX = s.map(output[0], 0, 1, 0, accRangeX)
                const accY = s.map(output[1], 0, 1, 0, accRangeY)


                ball.acc.add(s.createVector(accX, accY))

                ball.wasLeft = true
                if (ball.wasRight) {
                    this.nnRight.score += 1
                    ball.wasRight = false
                }
            }

            const distRight = ball.pos.dist(this.handRight)
            if (distRight < this.handRadius / 2) {

                const ballTransformed = ball.pos.copy().sub(this.handRight)
                // method 1
                const mappedX = s.map(ballTransformed.x, 0, this.handRadius, 0, 1)
                const mappedY = s.map(ballTransformed.y, 0, this.handRadius, 0, 1)
                var output = this.nnRight.activate([mappedX, mappedY, ballVelX, ballVelY]);

                // methode 2
                //const angle = calcAngle(ballTransformed, { x: 0, y: 0 }, s)
                //const mappedAngle = s.map(angle, -180, 180, 0, 1)
                //const dist = ballTransformed.dist(s.createVector(0, 0))
                //const mappedDist = s.map(dist, 0, this.handRadius / 2, 0, 1)
                //var output = this.nnRight.activate([mappedAngle, mappedDist, ballFalls, ballVelMag]);

                //const ballVel = ball.vel.normalize()
                //const velX = s.map(ballVel.x, -1, 1, 0, 1)
                //const velY = s.map(ballVel.y, -1, 1, 0, 1)
                //var output = this.nnRight.activate([velX, velY]);

                const accX = s.map(output[0], 0, 1, 0, -accRangeX)
                const accY = s.map(output[1], 0, 1, 0, accRangeY)

                ball.acc.add(s.createVector(accX, accY))

                ball.wasRight = true
                if (ball.wasLeft) {
                    this.nnLeft.score += 1
                    ball.wasLeft = false
                }
            }

            ball.acc.add(s.createVector(0, 0.1))
            ball.vel.add(ball.acc)
            ball.pos.add(ball.vel)
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