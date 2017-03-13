import * as PIXI from "pixi.js";
import sound from "pixi-sound";
import EventEmitter from "eventemitter3";

import Entity from "./entity";
import System from "./system";

import * as components from "../components";
import * as systems from "../systems";

export default class Application extends PIXI.Application {
    constructor(width, height, options, noWebGL) {
        super(width, height, options, noWebGL);

        this.event = new EventEmitter();
        this.loader = new PIXI.loaders.Loader();
        this.resources = this.loader.resources;

        this.systems = [];
        this.components = {};
        this.scenes = { current: null };
        this.groups = { all: new Set() };

        this.destroyQueue = new Set();

        for (const c in components) this.c(c, components[c]);
        for (const s in systems)    this.s(systems[s]);

        this.ticker.add(() => {
            this.event.emit("update", this.ticker.deltaTime);
        });

        this.event.on("update", (dt) => {
            for (const entity of this.destroyQueue) {
                entity.destroy();
                this.destroyQueue.delete(entity);
            }

            for (const system of this.systems) {
                system.emit("update", dt);
            }

            for (const entity of this.groups.all) {
                entity.emit("update", dt);
            }
        });
    }

    e(entity) { return new Entity(this, entity); }

    c(name, component) {
        this.components[name] = component;
        this.groups[name] = new Set();
    }

    s(system) { return new System(this, system); }

    scene(name, scene) {
        if (scene) this.scenes[name] = scene;
        else {
            const next = () => {
                for (const entity of this.groups.all) {
                    if (!entity.persistent) entity.queueDestroy();
                }
                // TODO: Also destroy any display objects in stage?
                this.scenes.current = this.scenes[name];
                this.scenes[name].enter();
            };

            const curScene = this.scenes.current;
            if (curScene && curScene.exit) curScene.exit(next);
            else next();
        }
    }
}
