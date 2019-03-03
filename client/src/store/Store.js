import {decorate, configure, observable, action, computed, runInAction} from 'mobx'
import tiles from '../monopoly';
import io from 'socket.io-client';

configure({enforceActions: "observed"});
const turnState = [
    "START",
    "BUY",
    "END",
    "NOT_TURN"
];

class Store {
    socket = io("http://localhost:3001/");
    players = [];
    username = null;
    player = 0;
    currentPlayer = 0;
    turnState = "START";
    dice = [0, 0];
    gameTilesID = tiles.map((el) => {
        const simple = {name: el.name};
        if (el.cost) {
            simple.bought = false;
            simple.player = null;
        }
        return simple;
    });
    gameTiles = tiles;
    mousedOverTile = 0;
    buyProcessStarted = false;
    connectToGame = (game_name, username) => {
        console.log(game_name)
        this.socket.emit('game_join', {username, game_name});
        this.socket.emit('get_game_info', {game_name});
    };

    constructor() {
        this.socket.on("game_info", (data) => {
            console.log(data);
            this.setGameInfo(data.game_info, data.player_info, data.game_name);
            this.changeCurrentPlayer(data.current_player);
        });
        const lastGame = JSON.parse(localStorage.getItem("last_game"));
        if (lastGame) {
            console.log(lastGame)
            this.setUsername(lastGame.username);
            this.connectToGame(lastGame.game_name, lastGame.username);
        }
    }

    setUsername = (username) => {
        this.username = username;
    }
    newGame = (game_name, username) => {
        this.socket.emit("create_game", {
            game_name: game_name,
            player_info: [{username: username, position: 0, money: 1500, color: 'red'}],
            game_info: this.gameTilesID,
        })
    };
    joinGame = (game_name, username) => {
        // this.socket.emit("join_game", {
        //     game_name: game_name,
        //     username: username,
        // })
        this.username = username;
        localStorage.setItem("last_game", JSON.stringify({game_name, username}));
        this.connectToGame(game_name, username);
    };
    setGameInfo = (gameInfo, playerInfo, game_name) => {
        console.log(playerInfo);
        this.gameTilesID = gameInfo;
        this.players = playerInfo;
        this.player = playerInfo.findIndex(el => el.username === this.username);
        this.game_name = game_name;
    }
    changeCurrentPlayer = (player) => {
        this.currentPlayer = player;
    };
    setMousedOverTile = (tile) => {
        this.mousedOverTile = tile;
        console.log(this.mousedOverTile)
    };
    clearMousedOverTile = () => {
        this.mousedOverTile = this.thisPlayer.position;
        console.log(this.mousedOverTile)
    };
    rollDice = () => {
        this.dice[0] = Math.floor(Math.random() * Math.floor(6)) + 1;
        this.dice[1] = Math.floor(Math.random() * Math.floor(6)) + 1;
        console.log(this.diceSum)
    };
    buyProperty = () => {
        const tile = this.gameTilesID[this.thisPlayer.position];
        if (!tile.owned && this.gameTiles[this.thisPlayer.position].cost) {
            tile.owned = true;
            tile.player = this.player;
            const player = this.thisPlayer;
            player.money -= tile.cost;
            this.players[this.currentPlayer] = player;
            this.gameTilesID[this.thisPlayer.position] = tile;
        }
    };
    endTurn = () => {
        this.turnState = "NOT_TURN";
        const newCurrentPlayer = this.circularAdd(this.currentPlayer, 1, this.players.length - 1);
        this.socket.emit('end_turn', {
            game_name: this.game_name,
            id: this.player,
            next_player: newCurrentPlayer,
            game_info: this.gameTilesID,
            player_info: this.players,
        });
    };
    buyPrompt = (playerBuys) => {
        if (playerBuys) {
            this.buyProperty();
        }
        this.buyProcessStarted = false;
        this.endTurn();
    };
    rollAndMove = () => {
        this.turnState = "BUY";
        this.rollDice();
        this.players[this.currentPlayer].position = this.circularAdd(this.players[this.currentPlayer].position, this.diceSum, 39);
        this.clearMousedOverTile();
        console.log(this.playerTile)
        if (!this.playerTile.owned && this.playerGameTile.cost) {
            this.buyProcessStarted = true;
        } else {
            this.endTurn();
        }
    };

    circularAdd = (val, num, max) => {
        if (val + num > max) {
            num = num - (max - val);
            return num - 1;
        } else {
            return val + num;
        }
    };

    get thisPlayersTurn() {
        return this.player === this.currentPlayer;
    };

    get diceSum() {
        return this.dice[0] + this.dice[1];
    }

    get thisPlayer() {
        return this.players[this.player];
    }

    get positions() {
        return this.players.map(el => el.position);
    };

    get playerTile() {
        return this.gameTilesID[this.thisPlayer.position];
    }

    get playerGameTile() {
        return this.gameTiles[this.thisPlayer.position];
    }

    get mousedOverTileInfo() {
        return this.gameTilesID[this.mousedOverTile];
    };

    get inGame() {
        if (this.players.findIndex(el => el.username === this.username) === -1) {
            return false;
        } else {
            return true;
        }
    }
}

decorate(Store, {
    players: observable,
    player: observable,
    currentPlayer: observable,
    turn: observable,
    gameTiles: observable,
    gameTilesID: observable,
    game_name: observable,
    turnState: observable,
    mousedOverTile: observable,
    buyProcessStarted: observable,
    positions: computed,
    diceSum: computed,
    thisPlayersTurn: computed,
    thisPlayer: computed,
    inGame: computed,
    mousedOverTileInfo: computed,
    playerTile: computed,
    rollDice: action,
    takeTurn: action,
    buyProperty: action,
    clearMousedOverTile: action,
    setMousedOverTile: action,
    rollAndMove: action,
    setUsername: action,
    buyPrompt: action,
    changeCurrentPlayer: action,
    setGameInfo: action,
    joinGame: action,
});

export default new Store();