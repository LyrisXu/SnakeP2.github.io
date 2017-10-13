"use strict";
/***
$表示 function $(id) {return document.getElementById(id);}
获取html中element
***/
var disp = $('.game-display'),
    msg = $('.msg');
var gameRunning=false;
var gameInterval;
var availablePixels; 
var currentCoin; //食物的位置
var award;
var boom, boomInt, boomPixels;
var score=0, bestscore=0;


//定义计时器相关
var timeStep, frameStep, currentTime;
var BAD_MOVE=1, ACE_MOVE=2, GOOD_MOVE=3;

//在游戏区域填入pixel像素
var initialLength = 8;
var dispWidthInPixels = 20;
for (var i = 0; i < dispWidthInPixels; i++) {
    for (var j = 0; j < dispWidthInPixels; j++) {
        var tmp = $('<div class="pixel" data-x="' + j + '" data-y="' + i + '"></div>');
        disp.append(tmp);
    }
}

var showMessage = function(ma,mb){
	msg.find('.msg-a').text(ma);
	msg.find('.msg-b').text(mb);	
};

var useNextRandomPixelForCoin = function(){
	var ap = availablePixels;
	//如果ap=0表示没有可用像素
	if (ap.length === 0) {return false;}
	//仍有可用像素位置生成食物
	var idx = Math.floor(Math.random() * ap.length);
    currentCoin = ap.splice(idx, 1)[0].split('|');
	//将html中相应位置标记
	$('div.pixel[data-x="' + currentCoin[0] + '"][data-y="' + currentCoin[1] + '"]').addClass('food');
	return true;
};

var useNextRandomPixelForAward = function(){
	var ap = availablePixels;
	if (ap.length === 0) {return false;}
	var idx = Math.floor(Math.random() * ap.length);
    award = ap.splice(idx, 1)[0].split('|');
	$('div.pixel[data-x="' + award[0] + '"][data-y="' + award[1] + '"]').addClass('award');
	return true;	
};

var useNextRandomPixelForBoom = function(){
	var ap = availablePixels;
	if (ap.length === 0) {return false;}
	var idx = Math.floor(Math.random() * ap.length);
    boom = ap.splice(idx, 1)[0].split('|');
    boomPixels.push(boom[0] + '|' + boom[1]);
	$('div.pixel[data-x="' + boom[0] + '"][data-y="' + boom[1] + '"]').addClass('boom');
	return true;	
};

//释放像素，将网页中像素remove，并且重新加回availablePixels的array中
var releasePixel = function(x, y) {
    $('div.pixel[data-x="' + x + '"][data-y="' + y + '"]').removeClass('taken');
    availablePixels.push(x + '|' + y);
};
var releaseFood = function(x, y) {
	$('div.pixel[data-x="' + x + '"][data-y="' + y + '"]').removeClass('food');
	$('div.pixel[data-x="' + x + '"][data-y="' + y + '"]').addClass('taken');
    availablePixels.push(x + '|' + y);
};

var releaseAward = function(x,y){
	$('div.pixel[data-x="' + x + '"][data-y="' + y + '"]').removeClass('award');
	$('div.pixel[data-x="' + x + '"][data-y="' + y + '"]').addClass('taken');
	award[0]=null;award[1]=null;
}

var releaseBoom = function(){
	var ap = availablePixels;
	var bp = boomPixels;
	for (var i in bp) {
		ap.push(bp[i]);
	}	
	$('.pixel').removeClass('boom');
	bp=[];
}

//抓取像素
var tryAllocatingPixel = function(x,y){
	var ap = availablePixels;
	var p = x + '|' + y; 
	var idx = ap.indexOf(p); //找p的index，如果没有返回-1
	if (idx !== -1) {
		ap.splice(idx, 1);
		//将html中相应位置(x,y)的pixel变色
		$('div.pixel[data-x="' + x + '"][data-y="' + y + '"]').addClass('taken');
		return true;
	} else {
		return false;
	}
};


//调整速度,参数l表示蛇长
var adjustSpeed = function(l) {
	//通过调整frameStep来调整蛇移动的速度
    if (l >= 300) {
        frameStep = 100;
    } else if (l >= 200) {
        frameStep = 200;
    } else if (l >= 100) {
        frameStep = 300;
    } else if (l >= 50) {
        frameStep = 400;
    }
};

var scoreJudge = function(){
	if (score<bestscore){
		score = score+2;
		document.getElementById("rlscore").innerHTML = score;
	} else {
		score=score+2;
		bestscore=score;
		document.getElementById("rlscore").innerHTML = score;
		document.getElementById("best").innerHTML = bestscore;
	}
}


//定义上下左右
var DIR_DOWN = 'd',
	DIR_UP = 'u',
	DIR_LEFT = 'l',
	DIR_RIGHT = 'r';



//定义snake
var snake = {
    direction: 'l',
    bodyPixels: [],
    move: function() {
		/***蛇的移动func
		逻辑：移动时，获取蛇头像素的位置，并且沿着移动方向，抓取蛇头前一个像素作为新的蛇头，释放蛇尾像素
			 遇到食物时，同样增加新的蛇头，但是不释放蛇尾。
		***/
		var head = this.bodyPixels[this.bodyPixels.length - 1];		
		var nextHead = [];
		var rand;

		//// 判断新蛇头的x坐标如何变化
		// 如果蛇头向左，那么新的蛇头x坐标是原来的蛇头坐标-1 即 x-1
		if (this.direction === DIR_LEFT){
			nextHead.push(head[0] - 1);
		// 如果蛇头向右，那么新的蛇头x坐标是原来的蛇头坐标+1 即 x+1
		} else if (this.direction === DIR_RIGHT){
			nextHead.push(head[0] + 1);
		// 其他情况，x不变
		} else {
			nextHead.push(head[0]);
		}

		//// 判断新蛇头的y坐标如何变化		
		// 如果蛇头向上，那么新的蛇头y坐标是原来的蛇头坐标-1 即 y-1
		if (this.direction === DIR_UP){
			nextHead.push(head[1] - 1);
		// 如果蛇头向下，那么新的蛇头y坐标是原来的蛇头坐标+1 即 y+1
		} else if (this.direction === DIR_DOWN){
			nextHead.push(head[1] + 1);
		// 其他情况，y不变
		} else {
            nextHead.push(head[1]);
        }


		//// 判断如果新蛇头的x坐标，y坐标都和食物的位置一致，表示成功吃到食物
		if ( nextHead[0] == currentCoin[0] && nextHead[1] == currentCoin[1] ){
			this.bodyPixels.push(nextHead);
			adjustSpeed(this.bodyPixels.length);
			rand = Math.random()*10;

			//useNextRandomPixelForBoom();//随机生成障碍物
			releaseFood(currentCoin[0],currentCoin[1]); //释放像素
			scoreJudge();							

			//如果还有位置可以生产新的食物，表示下一步可以移动
			if (useNextRandomPixelForCoin()){
				if (score!=0 && score%10==0 && availablePixels.length!=0){
					$('div.pixel[data-x="' + award[0] + '"][data-y="' + award[1] + '"]').removeClass('award');
					availablePixels.push(award[0] + '|' + award[1]);
					useNextRandomPixelForAward();		
					return GOOD_MOVE;
				} else
					return GOOD_MOVE;
			//否则表示没有位置可以生成新的食物，已经走满地图，表示胜利
			} else {
				return ACE_MOVE;
			}
		} else if (nextHead[0] == award[0] && nextHead[1] == award[1]) {
			this.bodyPixels.push(nextHead);
			releaseAward(award[0],award[1]);
			releaseBoom();
			scoreJudge();
			//$('.pixel').removeClass('boom');

		////否则表示没有吃到
		} else if (tryAllocatingPixel(nextHead[0], nextHead[1])) {
            //释放蛇尾
            var tail = this.bodyPixels.splice(0, 1)[0];
            this.bodyPixels.push(nextHead);
            releasePixel(tail[0], tail[1]);
            return GOOD_MOVE;
        } else {
            return BAD_MOVE;
        }
    }
};


//初始化游戏
var initializeGame = function() {
	frameStep = 400;
	timeStep = 50;
	currentTime = 0;
	score = 0;

	boomInt =setInterval(useNextRandomPixelForBoom,5000);

	document.getElementById("rlscore").innerHTML = 0;
	$('.pixel').removeClass('taken');
	$('.pixel').removeClass('food');
	$('.pixel').removeClass('boom');
	$('.pixel').removeClass('award');

	//initialize all pixels
	availablePixels = [];
	boomPixels = [];

	for( var i = 0; i< dispWidthInPixels; i++ ){
		for(var j = 0; j< dispWidthInPixels; j++ ){
			availablePixels.push( i+ '|' +j );
		}
	}

    //initialize the snake	
	snake.direction = 'l';
	snake.bodyPixels = [];
	for (var i = 15, end = 15-initialLength; i>end; i--){
		tryAllocatingPixel(i,10);
		snake.bodyPixels.push([i,10]);
	}

	//随机生成一个食物的位置pixel
	useNextRandomPixelForCoin();
	useNextRandomPixelForAward();
};


var startMainLoop = function() {
	//通过两个变量控制蛇移动的速度
	gameInterval = setInterval (function (){
		currentTime += timeStep;
		if (currentTime >= frameStep){
			var m = snake.move();
			//如果蛇撞墙，游戏结束，按空格键重新开始
			if (m === BAD_MOVE) {
				clearInterval(gameInterval);
				clearInterval(boomInt);
				gameRunning = false;
				showMessage('Game Over', 'Press space to start again');
			} else if (m === ACE_MOVE) {
				clearInterval(gameInterval);
				clearInterval(boomInt);
				gameRunning = false;
				showMessage('You Won', 'Press space to start again');
			}
			currentTime %= frameStep;
		}
	}, timeStep);
	showMessage('','');
};


/***
响应用户按键,上下左右以及p键暂停
***/
$(window).keydown(function(e) {
	//console.log(e.which);  //在console中显示键盘的keycode
	var k = e.which|| e.keyCode;

	// space 空格键开始
	if (k === 32) {
		e.preventDefault();
		//如果此时游戏还未开始，space键按键代表开始游戏
		if (!gameRunning){
			initializeGame();
			startMainLoop();
			gameRunning = true;
		}

	//p键 暂停
	} else if (k === 80) {
		//如果游戏正在进行，按p键代表暂停；如果还未开局，则无视
		if (gameRunning) {
			// 如果此时计时器处于停止状态，按p键代表继续游戏，计时器开始继续计时
			//console.log('In p period')
			if (!gameInterval) {
				startMainLoop();			
			}else {
			// 否则，暂停
				clearInterval (gameInterval);
				clearInterval(boomInt);
				gameInterval = null;
				showMessage('Paused','');
			}
		}

	// up
	} else if (k === 38) {
		//阻止浏览器对按键的响应
		e.preventDefault();
		if (snake.direction	!== DIR_DOWN) //如果此时snake的方向不是向下
			snake.direction = DIR_UP;

	// down
	} else if (k === 40) {
		e.preventDefault();
		if (snake.direction	!== DIR_UP) //如果此时snake的方向不是向上
			snake.direction = DIR_DOWN;		
	
	// left
	} else if (k === 37) {
		e.preventDefault();
		if (snake.direction	!== DIR_RIGHT) //如果此时snake的方向不是向右
			snake.direction = DIR_LEFT;
	
	// right
	} else if (k === 39) {
		e.preventDefault();
		if (snake.direction	!== DIR_LEFT) //如果此时snake的方向不是向左
			snake.direction = DIR_RIGHT;

	// f键，left turn 左转
	} else if (k === 70) {
		//如果蛇此时方向是向下的，按左转键后方向变为向右
		if (snake.direction === DIR_DOWN) {
			snake.direction = DIR_RIGHT;
		//如果蛇此时方向是向右的，按左转键后方向变为向上
		} else if (snake.direction === DIR_RIGHT) {
			snake.direction = DIR_UP;
		//如果蛇此时方向是向上的，按左转键后方向变为向左
		} else if (snake.direction === DIR_UP) {
			snake.direction = DIR_LEFT;
		//如果蛇此时方向是向左的，按左转键后方向变为向下
		} else if (snake.direction === DIR_LEFT) {
			snake.direction = DIR_DOWN;
		}
	
	// j键，right turn 右转
	} else if (k === 74) {
		//如果蛇此时方向是向下的，按右转键后方向变为向左
		if (snake.direction === DIR_DOWN) {
			snake.direction = DIR_LEFT;
		//如果蛇此时方向是向右的，按右转键后方向变为向下
		} else if (snake.direction === DIR_RIGHT) {
			snake.direction = DIR_DOWN;
		//如果蛇此时方向是向上的，按右转键后方向变为向右
		} else if (snake.direction === DIR_UP) {
			snake.direction = DIR_RIGHT;
		//如果蛇此时方向是向左的，按右转键后方向变为向上
		} else if (snake.direction === DIR_LEFT) {
			snake.direction = DIR_UP;
		}

	}
});

showMessage('Welcome!', 'Press space to start');

