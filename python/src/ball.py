import vector

GRAVITY = vector.obj(x=0,y=0.01)
RANGE = 5

def dropped(pos):
    return pos.x < -RANGE or pos.x > RANGE or pos.y < -RANGE or pos.y > RANGE


class Ball:
    def __init__(self,pos):
        self.pos = pos
        self.acc = vector.obj(x=0, y=0)
        self.vel = vector.obj(x=0, y=0)
        self.dropped = False
    
    def update(self):
        if self.dropped: return

        self.acc += GRAVITY
        self.vel += self.acc
        self.pos += self.vel

        self.dropped = dropped(self.pos)

    
