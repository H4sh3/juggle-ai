import sketch, { inView } from "."
import { GRAVITY, height, NUM_AREAS, width } from "./config"

export const getBall = (pos, s) => {
    return {
        pos,
        acc: s.createVector(0, 0.1),
        vel: s.createVector(0, 0),
        wasLeft: false,
        wasRight: false,
        radius: 20,
        dropped: false,
        active: false,
        data: []
    }
}

const getStart = (input) => {
    for (let i = 0; i < input.length; i++) {
        if (input[i] == 1) {
            return i
        }
    }
}

const getTarget = (output) => {
    let maxIndex = 0
    let maxValue = -Infinity
    for (let i = 0; i < output.length - 1; i++) {
        if (output[i] > maxValue) {
            maxIndex = i
            maxValue = output[i]
        }
    }
    return maxIndex
}

const getAreas = (s, center, width) => {
    const areas = []
    const n = NUM_AREAS
    const h = Math.floor(n / 2)
    const step = width / n
    for (let i = -h; i < h; i++) {
        areas.push(center.copy().add(s.createVector(step / 2 + step * i, (width / n) / 2)))
    }
    return areas
}

export const calcAngle = (s, x, vel) => {
    const y = 0
    const v0 = vel.mag()

    const t1 = GRAVITY * Math.pow(x, 2) + 2 * Math.pow(v0, 2) * y
    const t2 = Math.pow(v0, 4) - GRAVITY * t1
    const t3 = Math.pow(v0, 2) + Math.sqrt(t2)
    const t4 = t3 / (GRAVITY * x)
    return Math.atan(t4)
}

const getRotationDict = (s, areasLeft, areasRight) => {
    const rotationDict = {}
    const addEntries = (vel, strength) => {
        for (let i = 0; i < areasLeft.length; i++) {
            let start = areasLeft[i]
            for (let j = 0; j < areasRight.length; j++) {
                let target = areasRight[j]

                const tmpVel = vel.copy()
                let angle = calcAngle(s, target.x - start.x, vel)
                while (isNaN(angle)) {
                    tmpVel.y -= 0.1
                    angle = calcAngle(s, target.x - start.x, tmpVel)
                }
                rotationDict[getKey(i, j, strength)] = {
                    vel: tmpVel,
                    angle
                }
            }
        }
    }
    addEntries(s.createVector(0, -1), 0)
    addEntries(s.createVector(0, -8), 1)
    return rotationDict
}

export const getKey = (s, t, strength) => {
    return `s-${s}#t-${t}#v-${strength}`
}

const isPointInRect = (pos, center, widthHalf) => {
    const minX = center.x - widthHalf
    const maxX = center.x + widthHalf
    const minY = center.y - 10
    const maxY = center.y + 10
    return (
        pos.x > minX &&
        pos.x < maxX &&
        pos.y > minY &&
        pos.y < maxY
    )
}

const getInput = (ball, areas) => {

    let minDist = Infinity
    let minDistAreaIndex
    for (let i = 0; i < areas.length; i++) {
        const dist = areas[i].dist(ball.pos)
        if (dist < minDist) {
            minDist = dist
            minDistAreaIndex = i
        }
    }

    let inputs = []
    for (let i = 0; i < areas.length; i++) {
        if (i == minDistAreaIndex) {
            inputs.push(1)
        } else {
            inputs.push(0)
        }
    }
    return inputs
}

export class Agent {
    constructor(s, nn) {
        this.nn = nn
        this.nn.score = 0
        this.areaWidth = 180
        this.leftCenter = s.createVector(100, height - 150)
        this.rightCenter = s.createVector(width - 100, height - 150)
        this.areasLeft = getAreas(s, this.leftCenter, this.areaWidth)
        this.areasRight = getAreas(s, this.rightCenter, this.areaWidth)
        this.rotationDict = getRotationDict(s, this.areasLeft, this.areasRight)
        this.init(s)
    }

    getBallSpawn(s, hand) {
        return s.createVector(hand.x, 150)
    }

    init() {
        this.ballCollision = false
        this.tmpData = []
        this.data = []
        this.balls = []
    }



    ballDropped() {
        return this.balls.some(b => b.dropped)
    }

    handleSpawn(s, i) {
        // spawn balls time delayed / different iterations
        if (i == 0) {
            this.balls.push(getBall(this.spawnPositions[0].copy(), s))
        }
        if (i == 0) {
            this.balls.push(getBall(this.spawnPositions[1].copy(), s))
        }
        if (i == 0) {
            this.balls.push(getBall(this.spawnPositions[2].copy(), s))
        }
        if (false && i == 20) {
            this.balls.push(getBall(this.spawnPositions[0].copy(), s))
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

    update(s, exploreRate, i) {
        this.handleSpawn(s, i)
        this.checkCollision()

        if (this.ballCollision || this.ballDropped()) return

        const widthHalf = this.areaWidth / 2
        const isLeft = (pos) => {
            return isPointInRect(pos, this.leftCenter, widthHalf)
        }

        const isRight = (pos) => {
            return isPointInRect(pos, this.rightCenter, widthHalf)
        }


        for (let i = 0; i < this.balls.length; i++) {
            const ball = this.balls[i]
            ball.acc = s.createVector(0, 0.1)

            ball.dropped = !inView(ball.pos)

            if (ball.dropped) {
                console.log("dropped")
                continue
            }

            const getOutputs = (input) => {
                let output
                if (s.random(0, 1) < exploreRate) {
                    output = []
                    for (let i = 0; i < NUM_AREAS + 1; i++) {
                        output.push(s.random(0, 1))
                    }
                } else {
                    output = this.nn.activate(input);
                }
                return output
            }

            const handleBallInArea = (area, mirror) => {
                let input = getInput(ball, area)

                const start = getStart(input)
                ball.pos = area[start].copy()

                input.push(-1)
                input.push(1)

                const output = getOutputs(input)
                const target = getTarget(output)

                let key;
                if (mirror) {
                    key = getKey(NUM_AREAS - 1 - start, NUM_AREAS - 1 - target, output[output.length - 1] > 0 ? 0 : 1)
                } else {
                    key = getKey(start, target, output[output.length - 1] > 0 ? 0 : 1)
                }
                const entry = this.rotationDict[key]

                ball.vel = entry.vel.copy().rotate(entry.angle * (mirror ? -1 : 1))
                ball.data.push({ input, output })
            }

            const handleScore = (side) => {
                if (ball[side]) {
                    // data inside ball resulted in this hit
                    this.data.push(ball.data)
                    ball.data = []
                    ball.hit = false
                    ball[side] = false
                    this.nn.score += 1
                }
            }

            if (isLeft(ball.pos)) {
                handleScore("wasRight")

                if (!ball.wasLeft) {
                    ball.wasLeft = true
                    // only once acceleration per contact
                    handleBallInArea(this.areasLeft, false)
                }

            } else {
                ball.active = false
            }

            if (isRight(ball.pos)) {
                handleScore("wasLeft")

                if (!ball.wasRight) {
                    ball.wasRight = true
                    // only once acceleration per contact
                    handleBallInArea(this.areasRight, true)
                }
            }

            ball.vel.y += GRAVITY / 2
            ball.pos.add(ball.vel)
            ball.vel.y += GRAVITY / 2
        }
    }
}