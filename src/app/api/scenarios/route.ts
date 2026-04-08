import { NextResponse } from 'next/server';

// 预设场景数据（临时硬编码，后续可改为数据库查询）
const SCENARIOS = [
  {
    id: 1,
    title: '忘记纪念日',
    description: '你忘记了我们恋爱一周年纪念日，没有任何表示，女友非常失望和生气。',
    opening_message:
      '你还记得今天是什么日子吗？哼，看来你根本就不在意我们的关系，连这么重要的日子都能忘记...'
  },
  {
    id: 2,
    title: '晚归未告知',
    description: '你昨晚深夜回家，没有提前告知，女友担心了一整晚，现在又气又委屈。',
    opening_message:
      '你昨晚到底去哪了？为什么不告诉我？我等到半夜都睡不着，你根本就不在乎我的感受！'
  },
  {
    id: 3,
    title: '未回复消息',
    description: '你一整天都没有回复女友的消息，她觉得自己被冷落和忽视，非常生气。',
    opening_message:
      '你今天怎么都不回我消息？我发了好多条给你，你一条都没回，难道你就这么忙吗？连关心我一下的时间都没有！'
  }
];

export async function GET() {
  try {
    return NextResponse.json({
      success: true,
      data: SCENARIOS
    });
  } catch (error) {
    console.error('获取场景列表失败:', error);
    return NextResponse.json(
      {
        success: false,
        error: '获取场景列表失败'
      },
      { status: 500 }
    );
  }
}
