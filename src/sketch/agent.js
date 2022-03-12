import sketch, { inView } from "."
import { height, width } from "./config"

const calcAngle = (v1, v2, s) => {
    const angleRad = Math.atan2(v1.x, v1.y) - Math.atan2(v2.x, v2.y)
    return s.degrees(angleRad)
}

const getBall = (pos, s) => {
    return {
        pos,
        acc: s.createVector(0, 0.1),
        vel: s.createVector(0, 0),
        wasLeft: false,
        wasRight: false,
        radius: 20,
        dropped: false,
        active: false
    }
}

const outputToAcc = (s, i, output) => {
    const accRangeX = 4
    const accRangeY = -8
    const accX = s.map(output[0], 0, 1, 0, accRangeX)
    const accY = s.map(output[1], 0, 1, 0, accRangeY)
    return s.createVector(accX, accY)
}
export class Agent {
    constructor(sketch, nn) {
        this.nn = nn
        this.nn.score = 0
        this.handLeft = sketch.createVector(100, height - 150)
        this.handRight = sketch.createVector(width - 100, height - 150)
        this.handRadius = 150

        this.initPosEtc(sketch)


    }

    initPosEtc(s) {
        this.ballCollision = false
        this.ballSpawn = s.createVector(this.handLeft.x, 150)
        this.tmpData = []
        this.data = []
        this.balls = []
        const xOffset = s.createVector(s.random(-15, 15), 0)
        this.balls.push(getBall(this.ballSpawn.copy(), s))
        //this.balls.push(getBall(s.createVector(this.handRight.x, 150), s))
    }

    score() {
        return this.nn.score
    }

    getInput(s, ball, hand, i) {

        // rasterized inputs
        const ballInRaster = (ball, raster) => {
            return (
                ball.pos.x >= raster.x &&
                ball.pos.y >= raster.y &&
                ball.pos.x <= raster.x + raster.w &&
                ball.pos.y <= raster.y + raster.h
            )
        }

        const stepsize = this.handRadius / 2
        const posOffsetX = hand.x - (this.handRadius / 2)
        const posOffsetY = hand.y//- (this.handRadius / 2)

        let input = []

        for (let x = 0; x < 2; x++) {
            const raster = {
                x: posOffsetX + x * stepsize,
                y: posOffsetY,
                w: stepsize,
                h: stepsize
            }

            if (ballInRaster(ball, raster)) {
                input.push(1)
                s.fill(0, 255, 0)
            } else {
                input.push(0)
                s.fill(255, 0, 0)
            }
            s.rect(raster.x, raster.y, raster.w, raster.h)
        }

        const velN = ball.vel.normalize()
        input = input.concat([velN.x, velN.y])
        return input
        return [mappedDist, mappedAngle, velXMapped, velYMapped]

        const mappedX = s.map(ball.pos.x, 0, width, -1, 1)
        const mappedY = s.map(ball.pos.y, 0, width, -1, 1)
        return [mappedX, mappedY]

        const halfHand = this.handRadius / 2
        const dist = ball.pos.dist(hand)
        const mappedDist = s.map(dist, 0, halfHand, -1, 1)
        const ballTransformed = ball.pos.copy().sub(hand)
        const angle = s.degrees(ballTransformed.heading())
        const mappedAngle = s.map(angle, -135, -45, -1, 1)
        //console.log({ mappedAngle })
        let velXMapped = s.map(ball.vel.x, -10, 10, -1, 1)
        let velYMapped = s.map(ball.vel.x, -10, 10, -1, 1)
        velXMapped = velXMapped > 1 ? 1 : velXMapped
        velXMapped = velXMapped < -1 ? -1 : velXMapped
        velYMapped = velYMapped > 1 ? 1 : velYMapped
        velYMapped = velYMapped < -1 ? -1 : velYMapped


        let output = [mappedAngle, mappedDist]
        if (i == 0) {
            output = output.concat([1, 0, 0])
        } else if (i == 0) {
            output = output.concat([0, 1, 0])
        } else if (i == 0) {
            output = output.concat([0, 0, 1])
        }
        return output
    }

    ballsDropped() {
        return this.balls.some(b => b.dropped)
    }

    handleSpawn(s) {
        if (this.balls.length < 3) {
            if (this.balls[this.balls.length - 1].pos.dist(this.ballSpawn) > 50) {
                this.balls.push(getBall(this.ballSpawn.copy(), s))
            }
        }
    }

    checkCollision() {
        this.balls.forEach(b1 => {
            this.balls.forEach(b2 => {
                if (b1 == b2) return

                if (b1.pos.dist(b2.pos) < b1.radius) {
                    this.ballCollision = true
                }
            })
        })
    }

    update(s, exploreRate) {
        this.handleSpawn(s)
        this.checkCollision()

        if (this.ballCollision) return


        const isLeft = (pos) => {
            const distLeft = pos.dist(this.handLeft)
            return distLeft < this.handRadius / 2 && pos.y <= this.handLeft.y + this.handRadius / 10 && pos.y >= this.handLeft.y
        }
        const isRight = (pos) => {
            const distRight = pos.dist(this.handRight)
            return distRight < this.handRadius / 2 && pos.y <= this.handRight.y + this.handRadius / 10 && pos.y >= this.handRight.y
        }


        for (let i = 0; i < this.balls.length; i++) {
            const ball = this.balls[i]
            ball.acc = s.createVector(0, 0.1)

            ball.dropped = !inView(ball.pos)

            if (ball.dropped) continue

            const getOutputs = (input) => {
                let output
                if (s.random(0, 1) < exploreRate) {
                    output = []
                    for (let i = 0; i < 2; i++) {
                        output.push(s.random(0, 1))
                    }
                } else {
                    output = this.nn.activate(input);
                }
                return output
            }

            if (isLeft(ball.pos)) {
                let input = this.getInput(s, ball, this.handLeft, i)
                input.push(-1)
                //input.push(s.map(this.nn.score % 10, 0, 10, -1, 1))
                const output = getOutputs(input)
                this.data.push({ input, output })

                ball.active = true
                ball.acc.add(outputToAcc(s, i, output))

                ball.wasLeft = true
                if (ball.wasRight) {
                    this.nn.score += 1
                    //                    this.data.push({
                    //                        score: this.nn.score,
                    //                        data: this.tmpData
                    //                    })
                    //                    this.tmpData = []
                    ball.wasRight = false
                    ball.hit = false
                }
            } else {
                ball.active = false
            }

            if (isRight(ball.pos)) {
                let input = this.getInput(s, ball, this.handRight, i)
                input.push(1)
                //input.push(s.map(this.nn.score % 10, 0, 10, -1, 1))
                const output = getOutputs(input)
                this.data.push({ input, output })

                ball.active = true
                const a = outputToAcc(s, i, output)
                a.x *= -1
                ball.acc.add(a)

                ball.wasRight = true
                if (ball.wasLeft) {
                    this.nn.score += 1
                    //this.data.push({
                    //    score: this.nn.score,
                    //    data: this.tmpData
                    //})
                    //this.tmpData = []
                    ball.wasLeft = false
                    ball.hit = false
                }
            }

            ball.vel.add(ball.acc)
            ball.pos.add(ball.vel)
        }
    }
}