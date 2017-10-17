#!/usr/bin/env python

import pygame
import json

DEFS = {
    1: ('Torch', '', 0),
    2: ('Rope', 'DR', 4),      # 2 (top) -> 4 (bottom)
    5: ('Spring', '', 0),
    8: ('Crawler', 'LR', 16),
    9: ('Bat', 'LR', 16),
    10: ('Spider', 'D', 12),   # 10 (top) -> 12 (spider)
    13: ('Blip', '', 0),
    14: ('Blip', 'LR', 16),
    # exits.
    24: ('Exit', 'X', 0),
    25: ('Exit', 'X', 1),
    26: ('Exit', 'X', 2),
    27: ('Exit', 'X', 3),
    28: ('Exit', 'X', 4),
    29: ('Exit', 'X', 5),
    30: ('Exit', 'X', 6),
    31: ('Exit', 'X', 7),
    # entrances.
    32: ('Entry', 'E', 0),
    33: ('Entry', 'E', 1),
    34: ('Entry', 'E', 2),
    35: ('Entry', 'E', 3),
    36: ('Entry', 'E', 4),
    37: ('Entry', 'E', 5),
    38: ('Entry', 'E', 6),
    39: ('Entry', 'E', 7),
    # player start.
    48: ('Belle', 'P', 0),
    # doors.
    56: ('Green Door', '', 0),
    57: ('Red Door', '', 0),
    58: ('Blue Door', '', 0),
    59: ('Orange Door', '', 0),
    # keys.
    64: ('Green Key', '', 0),
    65: ('Red Key', '', 0),
    66: ('Blue Key', '', 0),
    67: ('Orange Key', '', 0),
}

def findTile(img, x, y, dx, dy, marker, name):
    ox, oy = x, y
    while True:
        x += dx
        y += dy
        r,g,b,a = img.get_at((x,y))
        if b == marker:
            dist = (x - ox) if dx != 0 else (y - oy)
            return abs(dist) * 32
        if b == 0:
            # any gap in codes indicates a missing marker.
            print "missing end-marker %d for %s at [%d,%d]" % (marker,name,ox,oy)
            return 0

class JSONMap:
    def __init__(self, data):
        self.data = data
        self.width = self.data[u'width']
        self.height = self.data[u'height']
        self.tiles = self.data[u'layers'][0][u'data']
        self.codes = self.data[u'layers'][1][u'data']
        self.firstTile = self.data[u'tilesets'][0][u'firstgid']
        self.firstCode = self.data[u'tilesets'][1][u'firstgid']
        assert(self.data[u'layers'][0][u'width'] == self.width)
        assert(self.data[u'layers'][0][u'height'] == self.height)
        assert(self.data[u'layers'][0][u'x'] == 0)
        assert(self.data[u'layers'][0][u'y'] == 0)
    def get_size(self):
        return (self.width, self.height)
    def get_at(self, coords):
        x, y = coords
        ofs = y * self.width + x
        red = self.tiles[ofs] - self.firstTile
        if red < 0: red = 0 # for empty cells.
        blue = self.codes[ofs] - self.firstCode
        if blue < 0: blue = 0 # for empty cells.
        return red,0,blue,0

def convert(rooms, filename, roomId, exits):
    print filename
    with open(filename,'r') as f:
        img = JSONMap(json.load(f))
    w,h = img.get_size()
    L,T,R,B = w,h,0,0

    for i in xrange(1,len(exits),2):
        exits[i] -= 1 # remap 1-based entrance index to 0-based.

    for y in xrange(0,h):
        for x in xrange(0,w):
            r,g,b,a = img.get_at((x,y))
            if r != 0 or b != 0:
                if x < L: L = x # first col, initially image width.
                if x > R: R = x # last col, initially 0.
                if y < T: T = y # first row, initially image height.
                if y > B: B = y # last row, initially 0.
    if L >= R or T >= B:
        raise ValueError('map does not contain any tiles')
    map_w = R - L + 1
    map_h = B - T + 1

    startX = 0
    startY = 0
    tiles = [[0]*map_w for y in xrange(0,map_h)]
    spawns = [0] # TODO: sort spawns by type (for render batching)
    numSpawn = 0
    triggers = []  # client-side exit triggers.
    entrances = [] # server-side entry locations.
    for y in xrange(0,map_h):
        for x in xrange(0,map_w):
            r,g,b,a = img.get_at((L+x,B-y))
            tup = DEFS.get(b)
            if tup:
                name, scan, marker = tup
                xpos = x * 32 + 16 # horizontal center of tile (from left, +X)
                ypos = y * 32 + 16 # vertical center of tile (from bottom, +Y)
                if scan == 'X':
                    # TODO: accumulate mins,maxs to build up trigger zones.
                    reqd = marker*4+4
                    while len(triggers) < reqd: triggers.append(0)
                    ofs = reqd-4
                    xL,xR,xB,xT = xpos-14,xpos+13,ypos-14,ypos+13
                    print "code-tile [%d] at %d, %d -> %d, %d, %d, %d" % (marker+1, xpos, ypos, xL, xB, xR, xT)
                    if triggers[ofs]==0 and triggers[ofs+2]==0:
                        # first code-tile encountered for this exit.
                        exitOfs = marker*2
                        if exitOfs+1 >= len(exits):
                            raise ValueError('no supplied exit for code-tile [%d]' % (marker+1))
                        triggers[ofs] = xL
                        triggers[ofs+1] = xB
                        triggers[ofs+2] = xR
                        triggers[ofs+3] = xT
                    else:
                        # accumulate tile bounds to build up trigger zones.
                        if xL < triggers[ofs]: triggers[ofs] = xL
                        if xB < triggers[ofs+1]: triggers[ofs+1] = xB
                        if xR > triggers[ofs+2]: triggers[ofs+2] = xR
                        if xT > triggers[ofs+3]: triggers[ofs+3] = xT
                elif scan == 'E':
                    reqd = marker*2+2
                    while len(entrances) < reqd: entrances.append(0)
                    entrances[marker*2] = xpos
                    entrances[marker*2+1] = ypos
                elif scan == 'P':
                    startX = xpos
                    startY = ypos
                elif scan == 'DR':
                    # rope must render from the top of the top tile to the bottom of the bottom tile.
                    down = findTile(img, L+x, B-y, 0, 1, marker, name)
                    spawns.extend([b, xpos, ypos+16, down+32])
                    numSpawn += 1
                elif scan == 'D':
                    # spider must move from the middle of the top tile to the middle of the bottom tile.
                    # but the strand must extend to the top of the top tile (use a bg tile?)
                    down = findTile(img, L+x, B-y, 0, 1, marker, name)
                    spawns.extend([b, xpos, ypos, down])
                    numSpawn += 1
                elif scan == 'LR':
                    left = findTile(img, L+x, B-y, -1, 0, marker, name)
                    right = findTile(img, L+x, B-y, 1, 0, marker, name)
                    spawns.extend([b, xpos, ypos, xpos-left, xpos+right])
                    numSpawn += 1
                else:
                    spawns.extend([b, xpos, ypos])
                    numSpawn += 1
            tiles[y][x] = r

    lines = ["    " + (",".join(str(x) for x in row)) for row in tiles]
    spawns[0] = numSpawn # prefix with number of spawns.
    spawn = ",".join(str(x) for x in spawns)
    triggers.insert(0, len(triggers)/4) # prefix with number of triggers.
    trigger = ",".join(str(x) for x in triggers)
    exits = ",".join(str(x) for x in exits)
    entry = ",".join(str(x) for x in entrances)
    rooms.append('  "%d": { "exits":[%s], "entry":[%s], "startX":%d, "startY":%d, "map":[%d,%d,\n%s,\n    %s,\n    %s\n  ]}' %
                    (roomId, exits, entry, startX, startY, map_w, map_h, ",\n".join(lines), spawn, trigger))


def write(rooms, outfile):
    f = open(outfile, "wt")
    f.write("{%s\n}" % ",\n".join(rooms))
    f.close()


if __name__ == '__main__':
    rooms = []
    convert(rooms, "rooftops.json", 3, [4,4])
    convert(rooms, "upper.json", 4, [4,1, 0,1, 0,3, 3,1, 0,5, 0,6, 4,7])
    convert(rooms, "halls.json", 0, [4,2, 1,1, 4,3, 0,4, 4,5, 4,6])
    convert(rooms, "passages.json", 1, [0,2, 2,1, 1,3, 1,4])
    convert(rooms, "basement.json", 2, [1,2, 2,2, 2,3, 2,4])
    write(rooms, "../gen/rooms.json")
