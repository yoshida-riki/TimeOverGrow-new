<template>
  <v-app class="ma-0">
    <h2>今日のアウトプット内容</h2>
    <v-container fluid class="px-0 mt-3">
      <v-combobox
        v-model="select"
        :filter="filter"
        :hide-no-data="!search"
        :items="items"
        :search-input.sync="search"
        light
        class="form"
        label="タグを入力してください。"
        hide-selected
        clearable
        append-icon
        chips
        deletable-chips
        multiple
        small-chips
        solo
      >
        <template v-slot:selection="{ attrs, item, parent, selected }">
          <v-chip v-if="item === Object(item)" v-bind="attrs" :input-value="selected" label small color="tagcolor">
            <span class="tagcolor">
              {{ item.text }}
            </span>
            <v-icon
              small
              @click="
                parent.selectItem(item);
                close(item);
              "
              >mdi-close</v-icon
            >
          </v-chip>
        </template>
        <template v-slot:item="{ index, item }" class="tagcolor">
          <v-text-field
            v-if="editing === item"
            v-model="editing.text"
            autofocus
            flat
            hide-details
            solo
            @keyup.enter="edit(index, item)"
            class="field"
          ></v-text-field>
          <v-chip v-else label small class="tagcolor">
            <span class="tagcolor pa-0 d-block">{{ item.text }}</span>
          </v-chip>
          <v-spacer></v-spacer>
          <v-list-item-action @click.stop>
            <div class="d-flex">
              <v-btn icon @click.stop.prevent="edit(index, item)" class="field">
                <v-icon>{{ editing !== item ? 'mdi-pencil' : 'mdi-check' }}</v-icon>
              </v-btn>
              <v-btn icon @click="tagDelete(index, item)" class="field ml-2">
                <v-icon> mdi-trash-can-outline </v-icon>
              </v-btn>
            </div>
          </v-list-item-action>
        </template>
      </v-combobox>
    </v-container>
    <!-- ここからdialog設定 -->
    <v-dialog v-model="dialog" width="500">
      <v-card class="pa-5">
        <v-card-title class="headline px-2 text-center"> 学習時間を記入して下さい。 </v-card-title>
        <input
          v-model="hoursTimes"
          class="textbox-input mt-4"
          type="number"
          step="1"
          max="24"
          min="0"
          placeholder="3"
        />
        <span style="color: #70c2fd">時間</span>
        <input
          v-model="minutesTimes"
          class="textbox-input mt-4"
          type="number"
          step="10"
          max="60"
          min="0"
          placeholder="3"
        />
        <span style="color: #70c2fd">分</span>
        <v-card-actions class="pa-0">
          <v-spacer></v-spacer>
          <Button text :on-click="tagTime" class="ma-0">決定</Button>
        </v-card-actions>
      </v-card>
    </v-dialog>
    <v-textarea
      v-model.trim="bodys"
      class="textbox-area"
      label="JSの非同期処理(async,await)について学びました。"
      flat
      auto-grow
      outlined
      rows="1"
      row-height="100"
    />
    <div v-if="btn" class="button ma-0 pa-0">
      <Button :on-click="add" class="ma-0">
        <v-icon color="#70c2fd" class="pa-5"> mdi-send </v-icon>
      </Button>
    </div>
    <!-- ここまで -->
    <!-- ここからアラート設定 -->
    <v-alert class="mt-5" type="error" v-model="alert" dismissible outlined color="primary">
      <div class="title">入力欄が空欄です！</div>
      <div>
        タグ、時間、アウトプット内容のいずれかが空欄となっています！<br />
        もう一度確認をしたのち送信下さい！
      </div>
    </v-alert>
    <!-- ここまで -->
  </v-app>
</template>

<script>
import Vue from 'vue';
import Vuetify from 'vuetify';
import MessageModel from '../models/Message';
import TagModel from '../models/Tag';
import firebase, { dbTags } from '../plugins/firebase';
import Button from './Button';

Vue.use(Vuetify);

export default {
  components: {
    Button,
  },
  props: {
    onClick: {
      type: Function,
      required: true,
    },
    btn: {
      type: Boolean,
      default: true,
    },
  },
  data() {
    return {
      times: 0,
      bodys: '',
      tagTimes: 0,
      hoursTimes: 0,
      minutesTimes: 0,
      alert: false,
      editing: null,
      items: [{ header: 'タグを選択するか作成して下さい。' }],
      select: [],
      dbMessagesTags: [],
      search: null,
      dialog: false,
    };
  },
  watch: {
    select(val, prev) {
      if (val.length === prev.length) return;
      this.select = Array.prototype.map.call(Object(val), (value) => {
        if (typeof value === 'string') {
          value = {
            text: value,
          };
          this.items.push(value);
        }
        // ここでtag事の学習時間をdialogで入力させることができたらいいかも
        this.dialogTime();
        return value;
      });
    },
  },
  async created() {
    const tags = await TagModel.get();
    this.items = tags;
  },
  methods: {
    async add() {
      try {
        // messagesコレクションに保存処理。
        const message = await MessageModel.save({
          times: this.times,
          bodys: this.bodys,
          tags: this.dbMessagesTags,
        });

        // dbTagsへの保存処理。
        const uid = firebase.auth().currentUser.uid;

        const newSelect = JSON.parse(JSON.stringify(this.select));
        this.select = newSelect;

        this.select.forEach(async (element) => {
          const params = Object.assign(element, { uid });
          const TagSame = await dbTags.where('uid', '==', uid).where('text', '==', params.text).get();
          if (TagSame.docs) {
            let Tag = [];
            TagSame.docs.forEach((e) => {
              Tag = [];
              Tag.push(e.id);
            });

            let TagData = await (await dbTags.doc(Tag[0]).get()).data();
            if (TagData === undefined) {
              TagData = [];
            }
            const dbMessagesTagTime = TagSame.docs.map((doc) => {
              return doc.data();
            });

            if (dbMessagesTagTime.length !== 0) {
              params.time += await dbMessagesTagTime[0].time;
            }

            await dbTags.doc(Tag[0]).set({
              text: params.text,
              time: params.time,
              uid: params.uid,
            });
          }
        });

        this.onClick(message);
        (this.hoursTimes = 0), (this.minutesTimes = 0), (this.times = 0);
        this.bodys = '';
        this.select = '';
        this.dbMessagesTags = [];
      } catch {
        this.alert = true;
      }
    },
    // tagの削除機能
    async tagDelete(index, item) {
      item = JSON.parse(JSON.stringify(item));
      const tagData = await dbTags
        .where('text', '==', item.text)
        .where('time', '==', item.time)
        .where('uid', '==', item.uid)
        .get();

      tagData.docs.map(async (Element) => {
        await dbTags.doc(Element.id).delete();
        return Element.id;
      });

      await this.tagGet();
    },
    // tag一覧の同期
    async tagGet() {
      const tags = await TagModel.get();
      this.items = tags;
    },
    close(item) {
      this.times -= item.time;
    },
    dialogTime() {
      this.dialog = true;
    },
    // dialog内の決定ボタンで発火
    async tagTime() {
      this.dialog = false;
      const uid = firebase.auth().currentUser.uid;

      // 時間→分
      this.tagTimes = parseInt(this.hoursTimes) * 60 + parseInt(this.minutesTimes);

      Object.assign(this.select[this.select.length - 1], { time: parseInt(this.tagTimes) }, { uid });

      Object.assign(this.dbMessagesTags, {
        tags: this.select[this.select.length - 1],
        uid,
      });
      this.select[this.select.length - 1] = JSON.parse(JSON.stringify(this.select[this.select.length - 1]));

      this.dbMessagesTags.push(this.select[this.select.length - 1]);

      this.dbMessagesTags = this.dbMessagesTags.filter((item, index, array) => {
        return array.findIndex((nextItem) => item.text === nextItem.text) === index;
      });

      this.dbMessagesTags[this.dbMessagesTags.length - 1] = JSON.parse(
        JSON.stringify(this.dbMessagesTags[this.dbMessagesTags.length - 1])
      );

      // 合計値を格納
      this.times += this.tagTimes;

      this.hoursTimes = 0;
      this.minutesTimes = 0;
      this.tagTimes = 0;
    },
    async edit(index, item) {
      if (!this.editing) {
        this.editing = item;
        this.index = index;
      } else {
        this.editing = null;
      }
    },
    filter(item, queryText, itemText) {
      if (item.header) {
        return false;
      }

      const hasValue = (val) => (val != null ? val : '');
      const text = hasValue(itemText);
      const query = hasValue(queryText);

      return text.toString().toLowerCase().includes(query.toString().toLowerCase());
    },
  },
};
</script>

<style scoped>
.textbox-input {
  margin: 0;
  padding: 3px 10px;
  border: 1px solid rgb(161, 161, 161);
  -webkit-appearance: none;
}
h2,
.headline {
  color: #6cb4e4;
  text-align: center;
  padding: 0.25em;
  border-top: solid 2px #6cb4e4;
  border-bottom: solid 2px #6cb4e4;
  background: -webkit-repeating-linear-gradient(-45deg, #f0f8ff, #f0f8ff 3px, #e9f4ff 3px, #e9f4ff 7px);
}
.textbox-area {
  resize: none;
  background: white;
  border-radius: 5px;
  padding: 0;
  margin: 0;
}
.button {
  margin-right: 20px;
  text-align: right;
  padding: 10px;
  color: #70c2fd;
}

.tagcolor,
.theme--light.v-chip:not(.v-chip--active) {
  background: #a8d5ff;
}
.v-card > *:last-child:not(.v-btn):not(.v-chip) {
  margin: 0;
}
.field,
.textbox-input {
  border: solid 1px #7db4e6;
}
</style>
